const express = require('express');
const pool = require('./db'); // seu pool do PostgreSQL
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ===== Criar tabelas automaticamente =====
async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        endereco TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT,
        cep TEXT,
        obs TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS donation_items (
        id SERIAL PRIMARY KEY,
        donation_id INT REFERENCES donations(id) ON DELETE CASCADE,
        nome_item TEXT NOT NULL,
        quantidade NUMERIC NOT NULL,
        unidade TEXT NOT NULL
      );
    `);

    console.log('Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
}

// ===== Endpoint POST /donation =====
app.post('/donation', async (req, res) => {
  try {
    const {
      nome = '',
      endereco = '',
      numero = '',
      complemento = '',
      bairro = '',
      cidade = '',
      estado = '',
      cep = '',
      obs = '',
      items
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum item enviado.' });
    }

    // Validação simples dos itens
    for (const item of items) {
      if (!item.nome_item || !item.quantidade || !item.unidade) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cada item precisa ter nome, quantidade e unidade.' 
        });
      }
    }

    // Inserir doação
    const donationRes = await pool.query(
      `INSERT INTO donations 
       (nome, endereco, numero, complemento, bairro, cidade, estado, cep, obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [nome, endereco, numero, complemento, bairro, cidade, estado, cep, obs]
    );

    const donationId = donationRes.rows[0].id;

    // Inserir itens da doação
    const insertItemsPromises = items.map(item =>
      pool.query(
        `INSERT INTO donation_items (donation_id, nome_item, quantidade, unidade)
         VALUES ($1, $2, $3, $4)`,
        [donationId, item.nome_item, item.quantidade, item.unidade]
      )
    );
    await Promise.all(insertItemsPromises);

    res.json({ success: true, message: 'Doação salva com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar doação:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao salvar a doação.' });
  }
});

// Endpoint de teste
app.get('/', (req, res) => res.send('Backend funcionando!'));

// ===== Inicialização =====
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await criarTabelas();
});
