import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ProvisionResultsService } from '../openapi/component-provisioner';

@Injectable({
  providedIn: 'root'
})
export class ProvisionerService {

  constructor(private readonly provisionerResultService: ProvisionResultsService) {}

  requestComponentDeletion(projectKey: string, componentId: string): Observable<void> {
    /* eslint-enable @typescript-eslint/no-wrapper-object-types */
    return this.provisionerResultService.requestDeletion(projectKey, componentId).pipe(
      // The API returns a 201 on success, so we map it to void
      // If there's an error, it will be propagated as an error in the Observable
      map(() => {})
    );
    // eslint-enable @typescript-eslint/no-wrapper-object-types
  }

}