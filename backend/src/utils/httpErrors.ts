// Erreur applicative contrôlée.
// Exemple : throw new HttpError(401, 'Non authentifié')
// L'errorHandler s'appuie sur ce type pour renvoyer le bon status HTTP.
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
