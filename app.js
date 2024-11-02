import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configurar dotenv
dotenv.config();

// Definir __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota principal que serve o HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Rota de callback para receber o código de autorização
app.get("/callback", async (req, res) => {
  const authorizationCode = req.query.code;

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

    // Aqui, armazene os tokens de forma segura, por exemplo, em uma sessão ou banco de dados
    req.session = { access_token, refresh_token };

    // Redirecionar para o frontend com um sucesso
    res.redirect(
      `${process.env.FRONTEND_URL}dashboard?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (error) {
    console.error("Erro ao trocar o código por tokens:", error.response?.data);
    res.status(500).send("Falha na autenticação.");
  }
});

// Rota protegida que faz uma requisição à API da Bigin
app.get("/dashboard", async (req, res) => {
  const accessToken = req.session?.access_token;

  if (!accessToken) {
    return res.redirect("/");
  }

  try {
    // Exemplo: Obter contatos da Bigin
    const contactsResponse = await axios.get(
      "https://www.bigin.com/api/v2/contacts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const contacts = contactsResponse.data;

    // Renderizar os contatos em HTML
    let contactsHtml = "<h1>Contatos da Bigin</h1><ul>";
    contacts.forEach((contact) => {
      contactsHtml += `<li>${contact.Name} - ${contact.Email}</li>`;
    });
    contactsHtml += "</ul>";

    res.send(contactsHtml);
  } catch (error) {
    console.error("Erro ao obter contatos:", error.response?.data);
    res.send("Falha ao obter contatos.");
  }
});

export default app;
