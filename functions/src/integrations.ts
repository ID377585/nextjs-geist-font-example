import * as functions from "firebase-functions";
import axios from "axios";
import Stripe from "stripe";

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: "2022-11-15",
});

// API Correios para cálculo de frete
export const calculateFrete = functions.https.onCall(async (data, context) => {
  const { cepOrigem, cepDestino, peso, comprimento, altura, largura, diametro, servico } = data;

  try {
    const response = await axios.get("http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx", {
      params: {
        nCdEmpresa: "",
        sDsSenha: "",
        nCdServico: servico, // Ex: 04014 PAC
        sCepOrigem: cepOrigem,
        sCepDestino: cepDestino,
        nVlPeso: peso,
        nCdFormato: 1,
        nVlComprimento: comprimento,
        nVlAltura: altura,
        nVlLargura: largura,
        nVlDiametro: diametro,
        sCdMaoPropria: "N",
        nVlValorDeclarado: 0,
        sCdAvisoRecebimento: "N",
        StrRetorno: "json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Erro ao calcular frete Correios:", error);
    throw new functions.https.HttpsError("internal", "Erro ao calcular frete");
  }
});

// Gateway de Pagamento Stripe - criar pagamento
export const createStripePaymentIntent = functions.https.onCall(async (data, context) => {
  const { amount, currency, payment_method_types } = data;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: payment_method_types || ["card"],
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error("Erro ao criar PaymentIntent Stripe:", error);
    throw new functions.https.HttpsError("internal", "Erro ao criar pagamento");
  }
});

// Integração ERP (exemplo genérico)
export const syncWithERP = functions.https.onRequest(async (req, res) => {
  // Exemplo: receber dados do ERP e atualizar Firestore
  try {
    const { entity, data } = req.body;

    if (!entity || !data) {
      res.status(400).send("Parâmetros inválidos");
      return;
    }

    // Processar dados conforme entidade
    switch (entity) {
      case "produtos":
        // Atualizar produtos no Firestore
        // await updateProducts(data);
        break;
      case "pedidos":
        // Atualizar pedidos
        // await updateOrders(data);
        break;
      default:
        res.status(400).send("Entidade desconhecida");
        return;
    }

    res.status(200).send("Sincronização realizada com sucesso");
  } catch (error) {
    console.error("Erro na integração ERP:", error);
    res.status(500).send("Erro interno");
  }
});

// Nota Fiscal Eletrônica (NFe/NFCe) - exemplo genérico
export const emitirNFe = functions.https.onCall(async (data, context) => {
  // Exemplo: integração com API de emissão de NFe
  try {
    const { pedidoId, dadosNFe } = data;

    if (!pedidoId || !dadosNFe) {
      throw new functions.https.HttpsError("invalid-argument", "Dados inválidos para emissão");
    }

    // Chamar API externa para emissão
    // const response = await axios.post("https://api.nfe.io/v1/nfe", dadosNFe, { headers: { Authorization: "Bearer token" } });

    // Salvar status no Firestore
    // await db.collection("notas_fiscais").doc(pedidoId).set({ status: "emitida", response });

    return { success: true, message: "NFe emitida com sucesso" };
  } catch (error) {
    console.error("Erro ao emitir NFe:", error);
    throw new functions.https.HttpsError("internal", "Erro ao emitir NFe");
  }
});
