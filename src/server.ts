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
import { connectRedis } from "./config/redis";


dotenv.config();

const app = express();
app.use(express.json());

// Route pubbliche
app.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

// Route protette
app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", adminRoutes);
app.use("/api/vaccinazioni", vaccinazioneRoutes)
app.use("/api", vaccinoRoutes)
app.use("/api", lottoVaccinoRoutes);


// Error handler globale
const errorHandler: express.ErrorRequestHandler = (err, req, res, _next) => {
  console.log("ERRORE COMPLETO:", err);
  if (err.status === 401) {
    return res.status(401).json({ error: AppErrorsMessage.INVALID_JWT_TOKEN });
  }
  return res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
};
app.use(errorHandler);

// Avvio: redis e DB vengono confermati prima di iniziare ad accettare richieste
const start = async () => {
    try {
        await connectRedis();

        await sequelize.getSequelize().authenticate();
        console.log("Database connesso!");
        await sequelize.getSequelize().sync({ alter: true });
        console.log("Tabelle sincronizzate!");

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server avviato su porta ${port}`);
        });
    } catch (err) {
        console.error("Errore avvio server:", err);
        process.exit(1);
    }
};

start();
