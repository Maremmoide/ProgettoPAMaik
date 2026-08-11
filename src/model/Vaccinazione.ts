import * as Sequelize from 'sequelize';
import { DataTypes, Optional, Model } from 'sequelize';
import type { Vaccino } from './Vaccino';
import type { LottoVaccino } from './LottoVaccino';

/*
    * Modello Sequelize per la tabella "vaccinazioni".
    * Rappresenta l'evento di somministrazione: collega un utente (userCf) a un vaccino
    * (vaccinoId) e al lotto concreto da cui è stata prelevata la dose (lottoId).
    * Le associazioni (belongsTo) sono definite centralmente in Init_models.ts.
    */
 
// Interfaccia per gli attributi della vaccinazione

export interface VaccinazioneAttributes {
    id: number;

    userCf: string;

    vaccinoId: number;

    lottoId: number;

    dataVaccinazione: Date;
}

// Interfaccia per la creazione

export type VaccinazioneCreationAttributes = Optional<VaccinazioneAttributes, 'id'>;

// Classe modello Vaccinazione, implementa gli attributi definiti sopra

export class Vaccinazione
    extends Model<
        VaccinazioneAttributes,
        VaccinazioneCreationAttributes
    >
    implements VaccinazioneAttributes {

    public id!: number;

    public userCf!: string;

    public vaccinoId!: number;

    public lottoId!: number;

    public dataVaccinazione!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Popolate solo quando la query le include esplicitamente (vedi
    // Vaccinazione.belongsTo(Vaccino) e Vaccinazione.belongsTo(LottoVaccino) in Init_models.ts;
    // nessuno dei due ha un alias esplicito, quindi Sequelize usa il nome del modello).
    public readonly Vaccino?: Vaccino;
    public readonly LottoVaccino?: LottoVaccino;
}

/*
    * Inizializza il modello Vaccinazione su una determinata istanza di Sequelize.
    * @param sequelize - L'istanza di Sequelize a cui agganciare il modello.
    * @returns La classe Vaccinazione inizializzata, pronta per essere usata nelle query.
    */

export function initVaccinazioneModel(
    sequelize: Sequelize.Sequelize
): typeof Vaccinazione {

    Vaccinazione.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            userCf: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            vaccinoId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            lottoId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            dataVaccinazione: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: 'vaccinazioni',
            timestamps: true,
        }
    );

    return Vaccinazione;
}