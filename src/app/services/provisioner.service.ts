import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CreateIncidentAction, CreateIncidentParameter, ProvisionResultsService } from '../openapi/component-provisioner';

@Injectable({
  providedIn: 'root'
})
export class ProvisionerService {

  constructor(private readonly provisionerResultService: ProvisionResultsService) {}

  requestComponentDeletion(projectKey: string, componentId: string, incidentParams: CreateIncidentParameter[]): Observable<void> {
    // Disabling eslint rule for wrapper object types (String, Boolean) as the API expects these types and we need to ensure the correct type is sent in the request.
    // Enabling it back after the action object is created to avoid affecting other parts of the codebase.
    /* eslint-disable @typescript-eslint/no-wrapper-object-types */
    const action: CreateIncidentAction = {
      parameters: incidentParams
    };
    /* eslint-enable @typescript-eslint/no-wrapper-object-types */
    return this.provisionerResultService.createIncident(projectKey, componentId, action).pipe(
      // The API returns a 201 on success, so we map it to void
      // If there's an error, it will be propagated as an error in the Observable
      map(() => {})
    );
    // eslint-enable @typescript-eslint/no-wrapper-object-types
  }

}