// app.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv
dotenv.config();

// Definir __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware para servir arquivos estáticos (opcional)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota principal (opcional)
app.get('/', (req, res) => {
  res.send('Servidor Backend rodando.');
});

// Rota de callback para receber o código de autorização
app.get('/callback', async (req, res) => {
  const authorizationCode = req.query.code;

  if (!authorizationCode) {
    return res.status(400).send('Código de autorização não encontrado.');
  }

  try {
    // Trocar o código de autorização por tokens
    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: process.env.REDIRECT_URI,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Verificar se FRONTEND_URL está definido
    if (!process.env.FRONTEND_URL) {
      console.error('FRONTEND_URL não está definido nas variáveis de ambiente');
      return res.status(500).send('Erro de configuração no servidor.');
    }

    // Redirecionar para frontend /dashboard com tokens na URL
    res.redirect(`${process.env.FRONTEND_URL}dashboard?access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (error) {
    console.error('Erro ao trocar o código por tokens:', error.response?.data);
    res.status(500).send('Falha na autenticação.');
  }
});

// Rota para obter contatos da Bigin usando o access token (opcional)
app.get('/api/contacts', async (req, res) => {
  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).send('Access token não fornecido.');
  }

  try {
    const contactsResponse = await axios.get('https://www.bigin.com/api/v2/contacts', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json(contactsResponse.data);
  } catch (error) {
    console.error('Erro ao obter contatos:', error.response?.data);
    res.status(500).send('Falha ao obter contatos.');
  }
});

export default app;