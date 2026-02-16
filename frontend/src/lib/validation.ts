// Validation email "bonne pratique" (RFC 5322) pour limiter les emails invalides.
// L'API refait la validation côté serveur.
export function isValidEmailRfc5322(email: string) {
  const pattern =
    "^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\u0001-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u0021\\u0023-\\u005b\\u005d-\\u007f]|\\\\[\\u0001-\\u0009\\u000b\\u000c\\u000e-\\u007f])*\")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\\u0001-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u0021-\\u005a\\u0053-\\u007f]|\\\\[\\u0001-\\u0009\\u000b\\u000c\\u000e-\\u007f])+)\\])$";
  return new RegExp(pattern).test(email);
}

// Vérifie les problèmes de mot de passe.
// Règles métier : 8+ caractères, 1 minuscule, 1 majuscule, 1 chiffre.
export function getPasswordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < 8) issues.push("8 caractères minimum");
  if (!/[a-z]/.test(password)) issues.push("1 minuscule");
  if (!/[A-Z]/.test(password)) issues.push("1 majuscule");
  if (!/\d/.test(password)) issues.push("1 chiffre");
  return issues;
}
