import cors from "cors";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Endpoint para iniciar o fluxo OAuth
app.post("/", (req, res) => {
  const zohoAuthUrl = `https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(
    "ZohoCRM.modules.ALL" // Escopo atualizado para acessar contatos
  )}&access_type=offline&prompt=consent&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;

  console.log("Redirecionando para o login Zoho OAuth...");
  console.log("URL de Autenticação Zoho:", zohoAuthUrl);
  res.redirect(zohoAuthUrl);
});

// Endpoint de callback para trocar o código por tokens
app.get("/callback", async (req, res) => {
  const authorizationCode = req.query.code;
  console.log("Código de autorização recebido:", authorizationCode);

  if (!authorizationCode) {
    console.error("Erro: Código de autorização não encontrado.");
    return res.status(400).send("Código de autorização não encontrado.");
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      null,
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: REDIRECT_URI,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

   

    const tokenResponseData = tokenResponse.data;
    console.log("!!!!!!!!!!!!!!!!!!!!");
    console.log("!!!!!!!!!!!!!!!!!!!!");
    console.log("Resposta de tokens:", tokenResponseData);
    console.log("!!!!!!!!!!!!!!!!!!!!");
    console.log("!!!!!!!!!!!!!!!!!!!!");

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log("Access Token:", access_token);
    console.log("Refresh Token:", refresh_token);
    console.log("Expira em:", expires_in, "segundos");

    try {
      const contactsResponse = await axios.get(
        "https://www.zohoapis.com/crm/v2/Contacts",
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${access_token}`,
          },
        }
      );

      console.log("Contatos obtidos da API do Zoho:", contactsResponse.data);
    } catch (error) {
      console.error(
        "Erro ao obter contatos da API do Zoho:",
        error.response?.data
      );
      console.error("Detalhes do erro:", error);
    }

    const redirectUrl = `${FRONTEND_URL}/dashboard?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    console.log("Redirecionando para o frontend com tokens:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Erro ao trocar o código por tokens:", error.response?.data);
    console.error("Detalhes do erro:", error);
    res.status(500).send("Falha na autenticação.");
  }
});

// Endpoint de saúde do servidor
app.get("/health", (req, res) => {
  res.send("Servidor Backend rodando.");
});

export default app;
