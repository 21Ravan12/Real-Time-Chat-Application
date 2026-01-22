import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Function to compare a password with a hashed password
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Function to generate a random identification code
export const generateRandomCode = () => {
  return Math.floor(Math.random() * 999999) + 1;
};

