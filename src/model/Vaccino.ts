import * as Sequelize from 'sequelize';
import { DataTypes, Optional, Model } from 'sequelize';
import type { LottoVaccino } from './LottoVaccino';
import type { Vaccinazione } from './Vaccinazione';

/*
    * Modello Sequelize per la tabella "vaccini".
    * Un vaccino è l'anagrafica generale (es. "Pfizer"): i lotti concreti con le dosi
    * disponibili sono gestiti separatamente dal modello LottoVaccino.
    */
 
// Interfaccia per gli attributi del vaccino

export interface VaccinoAttributes {
    id: number;
    nome: string;
    durataCopertura: number;
}

// Interfaccia per la creazione

export type VaccinoCreationAttributes = Optional<VaccinoAttributes, 'id'>;

// Classe modello Vaccino, implementa gli attributi definiti sopra

export class Vaccino
    extends Model<VaccinoAttributes, VaccinoCreationAttributes>
    implements VaccinoAttributes {

    public id!: number;
    public nome!: string;
    public durataCopertura!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Popolate solo quando la query le include esplicitamente (vedi le associazioni
    // Vaccino.hasMany(LottoVaccino, { as: "lotti" }) e Vaccino.hasMany(Vaccinazione) in Init_models.ts;
    // quest'ultima non ha un alias esplicito, quindi Sequelize usa il default "Vaccinaziones").
    public readonly lotti?: LottoVaccino[];
    public readonly Vaccinaziones?: Vaccinazione[];
}

/*
    * Inizializza il modello Vaccino su una determinata istanza di Sequelize.
    * @param sequelize - L'istanza di Sequelize a cui agganciare il modello.
    * @returns La classe Vaccino inizializzata, pronta per essere usata nelle query.
    */

export function initVaccinoModel(
    sequelize: Sequelize.Sequelize
): typeof Vaccino {

    Vaccino.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            nome: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },

            durataCopertura: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: 'vaccini',
            timestamps: true,
        }
    );

    return Vaccino;
}