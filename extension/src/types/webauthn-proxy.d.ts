/**
 * Minimal ambient types for chrome.webAuthenticationProxy (Chrome 115+, not yet in
 * @types/chrome 0.0.279). Only the members we use are declared.
 * Ref: https://developer.chrome.com/docs/extensions/reference/api/webAuthenticationProxy
 */
declare namespace chrome.webAuthenticationProxy {
  interface CreateRequest {
    requestId: number;
    /** PublicKeyCredentialCreationOptions serialized as JSON (parseCreationOptionsFromJSON-compatible). */
    requestDetailsJson: string;
  }
  interface GetRequest {
    requestId: number;
    /** PublicKeyCredentialRequestOptions serialized as JSON. */
    requestDetailsJson: string;
  }
  interface IsUvpaaRequest {
    requestId: number;
  }
  interface DOMExceptionDetails {
    name: string;
    message?: string;
  }
  interface CreateResponseDetails {
    requestId: number;
    /** PublicKeyCredential.toJSON() string. Mutually exclusive with `error`. */
    responseJson?: string;
    error?: DOMExceptionDetails;
  }
  interface GetResponseDetails {
    requestId: number;
    responseJson?: string;
    error?: DOMExceptionDetails;
  }
  interface IsUvpaaResponseDetails {
    requestId: number;
    isUvpaa: boolean;
  }

  function attach(): Promise<string | undefined>;
  function detach(): Promise<string | undefined>;
  function completeCreateRequest(details: CreateResponseDetails): Promise<void>;
  function completeGetRequest(details: GetResponseDetails): Promise<void>;
  function completeIsUvpaaRequest(details: IsUvpaaResponseDetails): Promise<void>;

  const onCreateRequest: chrome.events.Event<(request: CreateRequest) => void>;
  const onGetRequest: chrome.events.Event<(request: GetRequest) => void>;
  const onIsUvpaaRequest: chrome.events.Event<(request: IsUvpaaRequest) => void>;
  const onRequestCanceled: chrome.events.Event<(requestId: number) => void>;
}
