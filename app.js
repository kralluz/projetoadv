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

// Middleware para servir arquivos estáticos (opcional, se precisar servir algum conteúdo)
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
    return res.send('Código de autorização não encontrado.');
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

    // Redirecionar para frontend /dashboard com tokens na URL
    res.redirect(`${process.env.FRONTEND_URL}dashboard?access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (error) {
    console.error('Erro ao trocar o código por tokens:', error.response?.data);
    res.send('Falha na autenticação.');
  }
});

export default app;
