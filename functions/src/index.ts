import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as rateLimit from "express-rate-limit";

admin.initializeApp();
const db = admin.firestore();

const app = express();

// Middleware para validação de dados
function validatePedido(req: express.Request, res: express.Response, next: express.NextFunction) {
  const pedido = req.body;
  if (!pedido || !pedido.items || !Array.isArray(pedido.items) || pedido.items.length === 0) {
    return res.status(400).json({ error: "Pedido inválido: itens são obrigatórios" });
  }
  // Validação adicional pode ser adicionada aqui
  next();
}

// Middleware para rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requisições por IP por minuto
  message: "Muitas requisições, por favor tente novamente mais tarde."
});

app.use(limiter);

// Endpoint para criar pedido com validação
app.post("/pedidos", validatePedido, async (req, res) => {
  try {
    const pedido = req.body;
    pedido.createdAt = admin.firestore.FieldValue.serverTimestamp();
    pedido.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await db.collection("pedidos").add(pedido);

    // Log de auditoria
    await db.collection("audit_logs").add({
      action: "create_pedido",
      userId: req.headers["x-user-id"] || "unknown",
      pedidoId: docRef.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: pedido
    });

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Trigger para logar atualizações em pedidos
export const logPedidoUpdate = functions.firestore
  .document("pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    await db.collection("audit_logs").add({
      action: "update_pedido",
      pedidoId: context.params.pedidoId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      before,
      after
    });
  });

// Trigger para logar exclusões em pedidos
export const logPedidoDelete = functions.firestore
  .document("pedidos/{pedidoId}")
  .onDelete(async (snap, context) => {
    const deletedData = snap.data();

    await db.collection("audit_logs").add({
      action: "delete_pedido",
      pedidoId: context.params.pedidoId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      deletedData
    });
  });

// Exportar app como função HTTP
export const api = functions.https.onRequest(app);
