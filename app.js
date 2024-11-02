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

app.get("/api/contacts", isAuthenticated, async (req, res) => {
  const accessToken = req.session.access_token;

  if (!accessToken) {
    return res.status(400).send("Access token não fornecido.");
  }

  try {
    const contactsResponse = await axios.get(
      "https://www.zohoapis.com/bigin/v2/users?type=AllUsers",
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    res.json(contactsResponse.data);
  } catch (error) {
    console.error("Erro ao obter contatos:", error.response?.data);

    // Se o token expirou, tentar renovar usando o refresh token
    if (error.response && error.response.status === 401) {
      const refreshToken = req.session.refresh_token;

      if (!accessToken) {
        return res.status(400).send("Access token não fornecido.");
      }
      if (refreshToken) {
        try {
          const tokenResponse = await axios.post(
            "https://accounts.zoho.com/oauth/v2/token",
            new URLSearchParams({
              client_id: process.env.CLIENT_ID,
              client_secret: process.env.CLIENT_SECRET,
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }).toString(),
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );

          const { access_token: newAccessToken } = tokenResponse.data;
          req.session.access_token = newAccessToken;

          // Tentar novamente obter os contatos com o novo access token
          const newContactsResponse = await axios.get(
            "https://www.zohoapis.com/bigin/v2/users?type=AllUsers",
            {
              headers: {
                Authorization: `Zoho-oauthtoken ${newAccessToken}`,
              },
            }
          );

          res.json(newContactsResponse.data);
        } catch (refreshError) {
          console.error(
            "Erro ao renovar o access token:",
            refreshError.response?.data
          );
          res
            .status(500)
            .send(
              "Falha ao renovar a autenticação. Por favor, faça login novamente."
            );
        }
      } else {
        res
          .status(401)
          .send("Refresh token não disponível. Faça login novamente.");
      }
    } else {
      res.status(500).send("Falha ao obter contatos.");
    }
  }
});

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
