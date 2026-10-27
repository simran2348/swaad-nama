/** The only account that sees the admin tools (checked on the server too). */
export const ADMIN_USERNAME = 'thelipaguss';

export const isAdmin = (username: string | null | undefined) =>
  username?.toLowerCase() === ADMIN_USERNAME;
