import * as Sequelize from 'sequelize';
import { DataTypes, Optional, Model } from 'sequelize';
import type { Vaccinazione } from './Vaccinazione';

/*
    * Modello Sequelize per la tabella "users".
    * Rappresenta sia gli utenti che gli operatori: il campo "role" stabilisce cosa può fare
    * chi possiede il token JWT associato a questo record (vedi AuthService.toRolesArray).
    */
 
// Interfaccia per gli attributi dell'utente

export interface UserAttributes {
    cf: string;
    name: string;
    email: string;
    passwordHash: string;
    token:number;
    role: 'admin' | 'user' | 'operator' | 'both'; // "both" = utente con ruoli sia user che operator
}

export type UserCreationAttributes = Optional<UserAttributes, 'cf' | 'token'>;

// Classe modello User, implementa gli attributi definiti sopra

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public cf!: string;
    public name!: string;
    public email!: string;
    public passwordHash!: string;
    token!: number;
    public role!: 'admin'| 'user' | 'operator' | 'both';

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Popolato solo quando la query usa { include: [{ model: Vaccinazione, as: "vaccinazioni" }] }
    // (vedi User.hasMany(Vaccinazione, { as: "vaccinazioni" }) in Init_models.ts).
    public readonly vaccinazioni?: Vaccinazione[];
}

/*
    * Inizializza il modello User su una determinata istanza di Sequelize.
    * @param sequelize - L'istanza di Sequelize a cui agganciare il modello.
    * @returns La classe User inizializzata, pronta per essere usata nelle query.
    */

export function initUserModel(sequelize: Sequelize.Sequelize): typeof User {
    User.init(
        {
            cf: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            passwordHash: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            token: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: 1,
                },
            },
            role: {
                type: DataTypes.ENUM('admin','user', 'operator', 'both'),
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: 'users',
            timestamps: true,
        }
    );
    return User;
}