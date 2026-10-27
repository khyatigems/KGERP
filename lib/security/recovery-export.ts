/** Pure formatter shared by the browser's download and clipboard actions. */
export function formatRecoveryExport(codes: string[], account: string) {
  return [
    "KHYATI GEMS — ERP RECOVERY CODES", "",
    `Account: ${account || "Current administrator account"}`, "",
    "Store this file securely outside ERP. Do not share it.",
    "Use your ERP password with one unused code when email verification is unavailable.",
    "Each code works once. Generating a replacement set invalidates the earlier set.", "",
    ...codes.map((value, index) => `${index + 1}. ${value}`), "",
    "Sign-in: choose 'Use a recovery code' on the ERP login page.", "",
  ].join("\n");
}
