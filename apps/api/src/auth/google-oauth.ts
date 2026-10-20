import { OAuth2Client } from "google-auth-library";
import type { RuntimeConfig } from "../config.js";
import type { VerifiedGoogleProfile } from "./auth-service.js";

export interface GoogleAuthorizationTransaction {
  state: string;
  nonce: string;
  issuedAt: number;
}

export class GoogleOAuthService {
  private readonly client: OAuth2Client;

  constructor(
    private readonly clientId: string,
    clientSecret: string,
    private readonly redirectUri: string,
  ) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  createAuthorizationUrl(transaction: GoogleAuthorizationTransaction): string {
    return this.client.generateAuthUrl({
      access_type: "online",
      include_granted_scopes: true,
      nonce: transaction.nonce,
      prompt: "select_account",
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: ["openid", "email", "profile"],
      state: transaction.state,
    });
  }

  async verifyAuthorizationCode(code: string, expectedNonce: string): Promise<VerifiedGoogleProfile> {
    const { tokens } = await this.client.getToken(code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");

    const ticket = await this.client.verifyIdToken({ idToken: tokens.id_token, audience: this.clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== expectedNonce) {
      throw new Error("Google identity verification failed.");
    }

    return {
      subject: payload.sub,
      email: payload.email,
      emailVerified: true,
      displayName: payload.name ?? payload.email.split("@")[0] ?? "Coach",
    };
  }

  static fromConfig(config: RuntimeConfig): GoogleOAuthService | null {
    if (!config.googleClientId || !config.googleClientSecret) return null;
    return new GoogleOAuthService(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
  }
}
