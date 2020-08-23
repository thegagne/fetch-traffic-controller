export class ControlledRequest extends Request {
  /**
   * Request with optional trafficPolicy in init.
   * @param {*} request
   * @param {object} init
   *   @param init.retries: int,
   *   @param init.attempt: int,
   *   @param init.delay: int (time in ms)
   *   @param init.abort: bool, // respond with 500
   *   @param init.circuitBreaker: bool, // response with 503
   *   @param init.timeout: int, // (time in ms)
   *   @param init.loadbalance: [ { destination: '<ip>', weight: int }, ... ],
   *   @param init.mirror: [ { destination: '<ip>', sample: int }, ... ]'
   */
  constructor(request, init) {
    super(request, init);
    if (init && init.trafficPolicy) {
      this.trafficPolicy = init.trafficPolicy;
      if (!init.trafficPolicy.attempt) {
        this.trafficPolicy.attempt = 1;
      }
    }
  }
  
}

export async function controlledFetch(controlledRequest) {
  /**
   * @param {ControlledRequest}
   * @returns {Response}
   */

  if (!controlledRequest.trafficPolicy) {
    return fetch(controlledRequest);
  }

  if ( controlledRequest.trafficPolicy.delay > 0 ) {
    await new Promise(resolve => setTimeout(resolve, controlledRequest.trafficPolicy.delay))
  }
  return fetch(controlledRequest)
    .then((response) => {
      // retries
      if (!response.ok && !(response.status < 500)) {
        if (controlledRequest.trafficPolicy.attempt <= controlledRequest.trafficPolicy.retries) {
          response.text(); // burning this so deno doesn't complain
          let nextRequest = new ControlledRequest(controlledRequest, 
            { trafficPolicy: controlledRequest.trafficPolicy });
          nextRequest.trafficPolicy.attempt += 1;
          return controlledFetch(nextRequest);
        }
        return response;
      }
      return response;
    }).then((response) => {
      // add traffic-info header
      let modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      let trafficInfo = [];
      if (controlledRequest.trafficPolicy.attempt > 0) {
        trafficInfo.push(`retries=${controlledRequest.trafficPolicy.attempt - 1}`);
      }
      if (controlledRequest.trafficPolicy.delay > -0) {
        trafficInfo.push(`delay=${controlledRequest.trafficPolicy.delay}`);
      }
      trafficInfo = trafficInfo.toString().replace(' ','').replace('"','');
      modifiedResponse.headers.set('traffic-info', trafficInfo);
      return modifiedResponse;
    });
}