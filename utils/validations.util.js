export const validateUsername = (username) => {
  if (username.length < 6) {
    return false;
  }

  return true;
};

export const validatePassword = (password) => {
  const regex = new RegExp(
    "^(?=.*d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,}$"
  );
  return regex.test(password);
};
