/**
 * API Gateway HTTP API validates the Cognito JWT before the request ever
 * reaches Lambda (see the CognitoAuthorizer in template.yaml). By the time
 * we're here, event.requestContext.authorizer.jwt.claims is trustworthy —
 * we never parse or verify the token ourselves.
 */
export function getUser(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims?.sub) {
    const err = new Error('Missing authenticated user context');
    err.statusCode = 401;
    throw err;
  }
  return { userId: claims.sub, email: claims.email };
}
