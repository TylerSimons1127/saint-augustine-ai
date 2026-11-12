export const storage = {
  get: async () =>
    typeof localStorage === "undefined"
      ? null
      : localStorage.getItem("saint-augustine-mobile-v1"),
  set: async (value: string) => {
    if (typeof localStorage !== "undefined")
      localStorage.setItem("saint-augustine-mobile-v1", value);
  },
};
