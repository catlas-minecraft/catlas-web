import { randomFillSync } from "node:crypto";
import { generateRandomString } from "@oslojs/crypto/random";

// 10-characters long string consisting of upper case letters
export const generateSecureRandomString = () => {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return generateRandomString(
    {
      read(bytes) {
        randomFillSync(bytes);
      },
    },
    alphabet,
    24,
  );
};
