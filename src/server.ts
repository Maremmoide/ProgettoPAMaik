import express from "express";
import dotenv from "dotenv";
import process from "process";
import { sequelize } from "./connector/connector";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import adminRoutes from "./routes/admin";
import vaccinoRoutes from "./routes/vaccino";
import vaccinazioneRoutes from "./routes/vaccinazione";
import lottoVaccinoRoutes from "./routes/lottovaccino";
import { AppErrorsMessage } from "./enum/AppErrorsMessage";
import {connectRedis}  from "./config/redis";


dotenv.config();

const app = express();
app.use(express.json());


// Avvio redis
const start = async () => {
    try {
        await connectRedis(); 

        app.listen(3000, () => {
            console.log("Server avviato su porta 3000");
        });
    } catch (err) {
        console.error("Errore avvio server:", err);
        process.exit(1);
    }
};

start();


// Connessione DB + sync tabelle
sequelize.getSequelize().authenticate()
  .then(() => {
    console.log("Database connesso!");
    return sequelize.getSequelize().sync({ alter: true }); 
  })
  .then(() => console.log("Tabelle sincronizzate!"))
  .catch((err: unknown) => console.error("Errore connessione DB:", err));

// Route pubbliche
app.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

// Route protette
app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", adminRoutes);
app.use("/api", vaccinoRoutes)
app.use("/api", lottoVaccinoRoutes);
app.use("/api/vaccinazioni", vaccinazioneRoutes)

// Error handler globale
const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  console.log("ERRORE COMPLETO:", err);
  if (err.status === 401) {
    return res.status(401).json({ error: AppErrorsMessage.INVALID_JWT_TOKEN });
  }
  return res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
};
app.use(errorHandler);

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on http://localhost:3000");
});