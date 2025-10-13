/* eslint-disable  @typescript-eslint/no-explicit-any */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NatsMessage, NatsMessageData, NatsService } from './nats.service';
import * as natsCore from '@nats-io/nats-core';
import * as jetstreamModule from '@nats-io/jetstream';
import * as kvModule from '@nats-io/kv';
import { AppConfigService } from './app-config.service';

describe('NatsService', () => {
  let service: NatsService;
  let mockConnection: jasmine.SpyObj<natsCore.NatsConnection>;
  let mockKvm: jasmine.SpyObj<kvModule.Kvm>;
  let mockKv: jasmine.SpyObj<kvModule.KV>;
  let mockJsm: jasmine.SpyObj<jetstreamModule.JetStreamManager>;
  let mockStreams: any;
  let mockConsumers: any;
  let mockJetstream: any;
  let mockConsumer: any;
  let mockIterator: any;
  let mockSubscription: jasmine.SpyObj<natsCore.Subscription>;
  
  let wsconnectSpy: jasmine.Spy;
  let jetstreamManagerSpy: jasmine.Spy;
  let kvmSpy: jasmine.Spy;
  
  let originalWsconnectDescriptor: PropertyDescriptor | undefined;
  let originalJetstreamManagerDescriptor: PropertyDescriptor | undefined;
  let originalKvmDescriptor: PropertyDescriptor | undefined;
  
  let mockAppConfigService: jasmine.SpyObj<AppConfigService>;

  beforeAll(() => {
    originalWsconnectDescriptor = Object.getOwnPropertyDescriptor(natsCore, 'wsconnect');
    originalJetstreamManagerDescriptor = Object.getOwnPropertyDescriptor(jetstreamModule, 'jetstreamManager');
    originalKvmDescriptor = Object.getOwnPropertyDescriptor(kvModule, 'Kvm');
  });
  
  afterAll(() => {
    if (originalWsconnectDescriptor) {
      Object.defineProperty(natsCore, 'wsconnect', originalWsconnectDescriptor);
    }
    if (originalJetstreamManagerDescriptor) {
      Object.defineProperty(jetstreamModule, 'jetstreamManager', originalJetstreamManagerDescriptor);
    }
    if (originalKvmDescriptor) {
      Object.defineProperty(kvModule, 'Kvm', originalKvmDescriptor);
    }
  });

  beforeEach(() => {
    mockConnection = jasmine.createSpyObj('NatsConnection', ['close']);
    mockKvm = jasmine.createSpyObj('Kvm', ['create']);
    mockKv = jasmine.createSpyObj('KV', ['get', 'put']);
    mockSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    mockAppConfigService = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    
    mockConsumer = {
      consume: jasmine.createSpy('consume').and.returnValue(Promise.resolve({
        [Symbol.asyncIterator]: () => ({
          next: jasmine.createSpy('next').and.resolveTo({
            done: true
          })
        })
      }))
    };
    
    mockConsumers = {
      add: jasmine.createSpy('add').and.returnValue(Promise.resolve({ name: 'test-consumer' })),
      get: jasmine.createSpy('get').and.returnValue(Promise.resolve(mockConsumer))
    };
    
    mockStreams = {
      find: jasmine.createSpy('find').and.returnValue(Promise.resolve('test-stream'))
    };
    
    mockJetstream = jasmine.createSpy('jetstream').and.returnValue({ consumers: mockConsumers });
    
    mockJsm = {
      streams: mockStreams,
      consumers: mockConsumers,
      jetstream: mockJetstream
    } as jasmine.SpyObj<jetstreamModule.JetStreamManager>;
    
    wsconnectSpy = jasmine.createSpy('wsconnect').and.returnValue(Promise.resolve(mockConnection));
    jetstreamManagerSpy = jasmine.createSpy('jetstreamManager').and.returnValue(Promise.resolve(mockJsm));
    kvmSpy = jasmine.createSpy('Kvm').and.returnValue(mockKvm);
    
    Object.defineProperty(natsCore, 'wsconnect', { get: () => wsconnectSpy });
    Object.defineProperty(jetstreamModule, 'jetstreamManager', { get: () => jetstreamManagerSpy });
    Object.defineProperty(kvModule, 'Kvm', { get: () => kvmSpy });
    
    mockIterator = {
      [Symbol.asyncIterator]: function() {
        let count = 0;
        const messages = [
          {
            subject: 'app.com.notifications.public',
            json: jasmine.createSpy('json').and.returnValue({ type: 'error', title: 'Test Alert', date: new Date().toISOString() }),
            headers: { get: (key: string) => key === 'Nats-Msg-Id' ? 'msg-1' : '' },
            info: { pending: 1 }
          },
          {
            subject: 'app.com.notifications.public',
            json: jasmine.createSpy('json').and.returnValue({ type: 'info', title: 'Test Info', date: new Date().toISOString() }),
            headers: { get: () => null },
            info: { pending: 0 }
          }
        ];
        
        return {
          next: async () => {
            if (count < messages.length) {
              return { value: messages[count++], done: false };
            } else {
              return { done: true };
            }
          }
        };
      }
    };
    
    mockConsumer.consume.and.returnValue(Promise.resolve(mockIterator));
    
    mockKvm.create.and.returnValue(Promise.resolve(mockKv));
    
    TestBed.configureTestingModule({
      providers: [
        NatsService,
        { provide: AppConfigService, useValue: mockAppConfigService },
      ]
    });

    mockAppConfigService.getConfig.and.returnValue({ natsUrl: 'nats://localhost:4222', natsUser: 'provisioner-front', natsPassword: 'provisioner-front-incredible-secured-password' });
    
    service = TestBed.inject(NatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should establish a NATS connection', async () => {
      await service.initialize('ws://localhost:4222');
      expect(wsconnectSpy).toHaveBeenCalledWith({ servers: 'ws://localhost:4222', user: 'provisioner-front', pass: 'provisioner-front-incredible-secured-password' });
    });

    it('should handle connection errors', async () => {
      const testError = new Error('Connection failed');
      wsconnectSpy.and.returnValue(Promise.reject(testError));
      
      let capturedError: Error | undefined;
      service.connectionError$.subscribe(error => {
        capturedError = error;
      });
      
      await expectAsync(service.initialize('ws://localhost:4222')).toBeRejectedWith(testError);
      expect(capturedError).toBe(testError);
    });
  });

  describe('initializeUser', () => {
    beforeEach(async () => {
      await service.initialize('ws://localhost:4222');
    });

    it('should initialize KV store and load messages', async () => {
      const mockEntry = {
        string: jasmine.createSpy('string').and.returnValue('[]')
      };
      mockKv.get.and.returnValue(Promise.resolve(mockEntry as unknown as kvModule.KvEntry));
      mockKv.get.and.callFake((key: string) => {
        if(key === 'app.project2.notifications.public.user123.read') {
          return Promise.resolve(null); // Simulate no entry for this key
        } else {
          return Promise.resolve(mockEntry as unknown as kvModule.KvEntry);
        }
      });
      
      await service.initializeUser('user123', ['project1', 'project2']);
      
      expect(kvmSpy).toHaveBeenCalledWith(mockConnection);
      expect(mockKvm.create).toHaveBeenCalledWith('bucket-user123');
      
      expect(mockKv.get).toHaveBeenCalledWith('app.com.notifications.public.user123.read');
      expect(mockKv.get).toHaveBeenCalledWith('app.com.notifications.private.user123.read');
      expect(mockKv.get).toHaveBeenCalledWith('app.project1.notifications.public.user123.read');
      expect(mockKv.get).toHaveBeenCalledWith('app.project2.notifications.public.user123.read');
      expect(mockKv.put).toHaveBeenCalledWith('app.project2.notifications.public.user123.read', '[]');
      expect(jetstreamManagerSpy).toHaveBeenCalledWith(mockConnection);
    });

    it('should throw an error if connection is not established when initializing kv store', async () => {
      service['connection'] = null;
  
      await expectAsync(service['initializeKvStore']('user123', [])).toBeRejectedWithError('NATS connection not established properly');
    });

    it('should handle errors in KV store initialization', async () => {
      const testError = new Error('KV creation failed');
      mockKvm.create.and.rejectWith(testError);
      
      let capturedError: Error | undefined;
      service.connectionError$.subscribe(error => {
        capturedError = error;
      });
      
      await expectAsync(service.initializeUser('user123', [])).toBeRejectedWith(testError);
      expect(capturedError).toBe(testError);
    });

    it('should throw an error if connection is not established when loading messages', async () => {
      service['connection'] = null;
  
      await expectAsync(service['loadMessages']('user123', [])).toBeRejectedWithError('NATS connection or KV client not initialized');
    });

    it('should handle errors while processing messages', async () => {
      spyOn(service, 'getReadMessageIds').and.returnValue(Promise.resolve([]));
      
      const invalidMessage = {
      subject: 'app.com.notifications.public',
      json: jasmine.createSpy('json').and.throwError('Invalid message format'),
      headers: { get: jasmine.createSpy('get').and.returnValue('msg-invalid') },
      info: { pending: 0 }
      };
    
      mockIterator[Symbol.asyncIterator] = function () {
      let count = 0;
      return {
        next: async () => {
        if (count === 0) {
          count++;
          return { value: invalidMessage, done: false };
        }
        return { done: true };
        }
      };
      };
    
      const consoleErrorSpy = spyOn(console, 'error');
    
      await service.initialize('ws://localhost:4222');
      await service.initializeUser('user123', []);
    
      await new Promise(resolve => setTimeout(resolve, 0));
    
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing message:', jasmine.any(Error));
    });

    it('should handle errors when loading initial messages from stream', async () => {
      const mockEntry = {
        string: jasmine.createSpy('string').and.returnValue('[]')
      };
      mockKv.get.and.returnValue(Promise.resolve(mockEntry as unknown as kvModule.KvEntry));
      await service.initializeUser('user123', []);
      mockStreams.find.and.throwError(new Error('Stream loading failed'));
  
      await expectAsync(service['loadMessages']('user123', [])).toBeRejectedWithError('Stream loading failed');
    });
  });

  describe('readMessages', () => {
    beforeEach(async () => {
      await service.initialize('ws://localhost:4222');
      
      const mockEntry = {
        string: jasmine.createSpy('string').and.returnValue('["existing-id"]')
      };
      mockKv.get.and.returnValue(Promise.resolve(mockEntry as unknown as kvModule.KvEntry));
      
      await service.initializeUser('user123', []);
    });

    it('should mark messages as read', async () => {
      mockKv.get.calls.reset();
      mockKv.get.and.returnValue(Promise.resolve({
        string: jasmine.createSpy('string').and.returnValue('["existing-id"]')
      } as unknown as kvModule.KvEntry));
      
      await service.readMessages('subject1', ['msg-1', 'msg-2']);
      
      expect(mockKv.get).toHaveBeenCalledWith('subject1');
      expect(mockKv.put).toHaveBeenCalledWith('subject1', '["existing-id","msg-1","msg-2"]');
    });

    it('should not add duplicate message IDs', async () => {
      mockKv.get.calls.reset();
      mockKv.get.and.returnValue(Promise.resolve({
        string: jasmine.createSpy('string').and.returnValue('["msg-1","existing-id"]')
      } as unknown as kvModule.KvEntry));
      
      await service.readMessages('subject1', ['msg-1', 'msg-2']);
      
      expect(mockKv.put).toHaveBeenCalledWith('subject1', '["msg-1","existing-id","msg-2"]');
    });

    it('should throw an error if KV store is not initialized', async () => {
      service['kv'] = null;
      
      await expectAsync(service.readMessages('subject1', ['msg-1'])).toBeRejectedWithError('KV store not initialized');
    });
    
    it('should throw an error if cannot mark as read', async () => {
      mockKv.get.and.throwError(new Error('fake'))
      await expectAsync(service.readMessages('subject1', ['msg-1'])).toBeRejectedWithError('fake');
    });

    it('should emit the proper values for unreadMessagesCountSubject', async () => {
      const unreadMessagesCountSpy = spyOn(service['unreadMessagesCountSubject'], 'next');

      // Setup messagesSubject with various read/unread and id combinations
      const messages = [
      { id: 'msg-1', read: false }, // will be marked as read
      { id: 'msg-2', read: false }, // will be marked as read
      { id: 'msg-3', read: false }, // stays unread
      { id: 'msg-4', read: true },  // already read
      { id: 'msg-5', read: false }, // stays unread
      ];
      service['messagesSubject'].next(messages as NatsMessage[]);

      // Case 1: Mark msg-1 and msg-2 as read, expect 2 unread left (msg-3, msg-5)
      mockKv.get.and.returnValue(Promise.resolve({
      string: jasmine.createSpy('string').and.returnValue('[]')
      } as unknown as kvModule.KvEntry));
      await service.readMessages('subject1', ['msg-1', 'msg-2']);
      expect(unreadMessagesCountSpy).toHaveBeenCalledWith(2);

      // Case 2: Mark all unread as read, expect 0 unread left
      mockKv.get.and.returnValue(Promise.resolve({
      string: jasmine.createSpy('string').and.returnValue('["msg-1","msg-2"]')
      } as unknown as kvModule.KvEntry));
      await service.readMessages('subject1', ['msg-3', 'msg-5']);
      expect(unreadMessagesCountSpy).toHaveBeenCalledWith(0);

      // Case 3: Mark already read messages, unread count should not go negative
      mockKv.get.and.returnValue(Promise.resolve({
      string: jasmine.createSpy('string').and.returnValue('["msg-1","msg-2","msg-3","msg-4","msg-5"]')
      } as unknown as kvModule.KvEntry));
      await service.readMessages('subject1', ['msg-1', 'msg-2']);
      expect(unreadMessagesCountSpy).toHaveBeenCalledWith(0);

      // Case 4: No unread messages at all
      service['messagesSubject'].next([
      { id: 'msg-1', read: true },
      { id: 'msg-2', read: true }
      ] as NatsMessage[]);
      mockKv.get.and.returnValue(Promise.resolve({
      string: jasmine.createSpy('string').and.returnValue('["msg-1","msg-2"]')
      } as unknown as kvModule.KvEntry));
      await service.readMessages('subject1', []);
      expect(unreadMessagesCountSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('getReadMessageIds', () => {
    beforeEach(async () => {
      await service.initialize('ws://localhost:4222');
      await service.initializeUser('user123', []);
    });

    it('should return read message IDs from KV store', async () => {
      mockKv.get.and.returnValue(Promise.resolve({
        string: jasmine.createSpy('string').and.returnValue('["msg-1","msg-2"]')
      } as unknown as kvModule.KvEntry));
      
      const readIds = await service.getReadMessageIds('subject1');
      
      expect(readIds).toEqual(['msg-1', 'msg-2']);
      expect(mockKv.get).toHaveBeenCalledWith('subject1');
    });

    it('should return empty array if key not found', async () => {
      mockKv.get.and.returnValue(Promise.resolve(null));
      
      const readIds = await service.getReadMessageIds('subject1');
      
      expect(readIds).toEqual([]);
    });

    it('should throw error if KV store not initialized', async () => {
      service['kv'] = null;
      
      await expectAsync(service.getReadMessageIds('subject1')).toBeRejectedWithError('KV store not initialized');
    });

    
    it('should throw an error if cannot read', async () => {
      mockKv.get.and.throwError(new Error('fake'))
      await expectAsync(service.getReadMessageIds('subject1')).toBeRejectedWithError('fake');
    });
  });

  describe('isMessageRead', () => {
    beforeEach(async () => {
      await service.initialize('ws://localhost:4222');
      await service.initializeUser('user123', []);
      
      spyOn(service, 'getReadMessageIds').and.returnValue(Promise.resolve(['msg-1', 'msg-3']));
    });

    it('should return true for read messages', async () => {
      const isRead = await service.isMessageRead('subject1', 'msg-1');
      expect(isRead).toBeTrue();
      expect(service.getReadMessageIds).toHaveBeenCalledWith('subject1');
    });

    it('should return false for unread messages', async () => {
      const isRead = await service.isMessageRead('subject1', 'msg-2');
      expect(isRead).toBeFalse();
    });
  });

  describe('close', () => {
    it('should unsubscribe from all subscriptions and close connection', async () => {
      await service.initialize('ws://localhost:4222');
      service['subscriptions'].set('subject1', mockSubscription);
      service['subscriptions'].set('subject2', mockSubscription);
      
      await service.close();
      
      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
      expect(service['subscriptions'].size).toBe(0);
      
      expect(mockConnection.close).toHaveBeenCalledTimes(1);
      expect(service['connection']).toBeNull();
    });
    
    it('should catch the errors if there are failures', async () => {
      await service.initialize('ws://localhost:4222');
      service['subscriptions'].set('subject1', mockSubscription);
      mockSubscription.unsubscribe.and.throwError(new Error('fake'));      
      await expectAsync(service.close()).toBeResolved();
    });
  });

  describe('isValidMessage', () => {
    it('should return true for valid messages', () => {
      const validMessage = {
        type: 'error',
        title: 'Test Alert',
        date: new Date().toISOString()
      } as NatsMessageData;
      
      expect(service.isValidMessage(validMessage)).toBeTrue();
    });

    it('should return false for messages missing required fields', () => {
      const invalidMessage1 = {
        title: 'Test Alert',
        date: new Date().toISOString()
      } as NatsMessageData;
      
      const invalidMessage2 = {
        type: 'error',
        date: new Date().toISOString()
      } as NatsMessageData;
      
      expect(service.isValidMessage(invalidMessage1)).toBeFalse();
      expect(service.isValidMessage(invalidMessage2)).toBeFalse();
    });

    it('should return false for messages with invalid date', () => {
      const invalidMessage = {
        type: 'error',
        title: 'Test Alert',
        date: 'not-a-date'
      } as NatsMessageData;
      
      expect(service.isValidMessage(invalidMessage)).toBeFalse();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call close method', () => {
      spyOn(service, 'close').and.returnValue(Promise.resolve());
      
      service.ngOnDestroy();
      
      expect(service.close).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when closing', fakeAsync(() => {
      const consoleErrorSpy = spyOn(console, 'error');
      const error = new Error('Close error');
      spyOn(service, 'close').and.returnValue(Promise.reject(error));
      
      service.ngOnDestroy();
      tick();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error closing NATS connection', error);
    }));
  });

  describe('loadMessages', () => {
    beforeEach(async () => {
      await service.initialize('ws://localhost:4222');
      
      const mockEntry = {
        string: jasmine.createSpy('string').and.returnValue('[]')
      };
      mockKv.get.and.returnValue(Promise.resolve(mockEntry as unknown as kvModule.KvEntry));
    });

    it('should load messages from streams and update subjects', async () => {
      spyOn(service, 'getReadMessageIds').and.returnValue(Promise.resolve([]));
      
      await service.initializeUser('user123', []);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockStreams.find).toHaveBeenCalledWith('app.com.notifications.public');
      expect(mockStreams.find).toHaveBeenCalledWith('app.com.notifications.private.user123');
      expect(mockConsumers.add).toHaveBeenCalledTimes(2);
      expect(mockConsumer.consume).toHaveBeenCalledTimes(2);
    });

    it('should handle stream not found', async () => {
      mockStreams.find.and.returnValue(Promise.resolve(null));
      
      const consoleErrorSpy = spyOn(console, 'error');
      
      await service.initializeUser('user123', []);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Stream not found for subject: app.com.notifications.public');
    });
  });
});