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

let access_token_static = "";

// Endpoint para iniciar o fluxo OAuth
app.post("/", (req, res) => {
  const zohoAuthUrl = `https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(
    "ZohoBigin.settings.ALL ZohoBigin.users.ALL ZohoBigin.org.ALL" // Escopo atualizado para acessar contatos
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
    access_token_static = access_token;
    console.log("Access Token:", access_token);
    console.log("Refresh Token:", refresh_token);
    console.log("Expira em:", expires_in, "segundos");

    console.log("tokenResponse.data", tokenResponse.data);
    const redirectUrl = `${FRONTEND_URL}/dashboard?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    console.log("Redirecionando para o frontend com tokens:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Erro ao trocar o código por tokens:", error.response?.data);
    console.error("Detalhes do erro:", error);
    res.status(500).send("Falha na autenticação.");
  }
});

// Nova Rota para Criar um Usuário no Zoho Bigin com Dados Estáticos
app.post("/createUser", async (req, res) => {
  // Dados de usuário fictícios e estáticos
  const staticUserData = {
    firstName: "João",
    lastName: "Silva",
    email: "joao.silva@exemplo.com",
    role: "Gerente de Vendas", // Certifique-se de que o role está correto conforme a API do Zoho
    // Adicione outros campos conforme necessário
  };

  try {
    // Defina a URL da API do Zoho Bigin para criar um usuário
    const zohoCreateUserUrl = "https://www.zohoapis.com/bigin/v1/users";

    // Configurar os cabeçalhos de autorização
    const headers = {
      Authorization: `Zoho-oauthtoken ${access_token_static}`,
      "Content-Type": "application/json",
    };

    // Corpo da solicitação com os dados do usuário estático
    const body = {
      data: [
        {
          first_name: staticUserData.firstName,
          last_name: staticUserData.lastName,
          email: staticUserData.email,
          role: staticUserData.role, // Certifique-se de que o role está correto conforme a API
          // Adicione outros campos conforme necessário
        },
      ],
    };

    // Fazer a solicitação para a API do Zoho Bigin
    const response = await axios.post(zohoCreateUserUrl, body, { headers });

    // Retornar a resposta da API para o cliente
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Erro ao criar usuário no Zoho Bigin:",
      error.response?.data || error.message
    );
    const response = error.response?.data;
    res
      .status(500)
      .json({ error: "Falha ao criar usuário no Zoho Bigin.", response });
  }
});

// Endpoint de saúde do servidor
app.get("/health", (req, res) => {
  res.send("Servidor Backend rodando.");
});

export default app;
