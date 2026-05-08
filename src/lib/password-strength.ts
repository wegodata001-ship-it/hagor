export type PasswordRulesState = {
  min8: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export function evaluatePasswordRules(password: string): PasswordRulesState {
  return {
    min8: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordMeetsAllRules(password: string): boolean {
  const r = evaluatePasswordRules(password);
  return r.min8 && r.upper && r.lower && r.number && r.special;
}

/** Server/client aligned with UI rules */
export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
