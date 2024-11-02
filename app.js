import cors from "cors";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware para servir arquivos estáticos (opcional)
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Rota principal (opcional)
app.get("/", (req, res) => {
  console.log("Servidor Backend rodando.");
  res.send("Servidor Backend rodando.");
});

// Rota de callback para receber o código de autorização
app.get("/callback", async (req, res) => {
  const authorizationCode = req.query.code;
  console.log("Código de autorização:", authorizationCode);

  if (!authorizationCode) {
    return res.status(400).send("Código de autorização não encontrado.");
  }

  try {
    // Trocar o código de autorização por tokens
    const tokenResponse = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      null,
      {
        params: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: process.env.REDIRECT_URI,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Verificar se FRONTEND_URL está definido
    if (!process.env.FRONTEND_URL) {
      console.error("FRONTEND_URL não está definido nas variáveis de ambiente");
      return res.status(500).send("Erro de configuração no servidor.");
    }

    // Redirecionar para frontend /dashboard com tokens na URL
    res.redirect(
      `${process.env.FRONTEND_URL}dashboard?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (error) {
    console.error("Erro ao trocar o código por tokens:", error.response?.data);
    res.status(500).send("Falha na autenticação.");
  }
});

const isAuthenticated = (req, res, next) => {
  if (req.session.access_token) {
    next();
  } else {
    res.status(401).send("Usuário não autenticado.");
  }
};

// Rota para exibir a página de contatos (opcional)
app.get("/dashboard", (req, res) => {
  const { access_token, refresh_token } = req.query;

  if (!access_token) {
    return res.status(400).send("Access token não fornecido.");
  }

  return res.json({
    access_token: access_token,
    refresh_token: refresh_token,
  });
});

export default app;
