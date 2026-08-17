import { User, UserAttributes } from "../model/User";

export type PublicUser = Omit<UserAttributes, "passwordHash">;

/**
 * Rimuove il passwordHash dall'oggetto User per evitare di esporlo nelle risposte API
 */
export function sanitizeUser(user: User): PublicUser {
    const userObj = user instanceof User ? user.toJSON() : user;
    const { passwordHash: _passwordHash, ...userWithoutPassword } = userObj;
    return userWithoutPassword;
}

/**
 * Rimuove il passwordHash da un array di utenti
 */
export function sanitizeUsers(users: User[]): PublicUser[] {
    return users.map(sanitizeUser);
}
