"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Google Analytics - Inicialização e rastreamento básico
export function useGoogleAnalytics(trackingId: string) {
  const router = useRouter();

  useEffect(() => {
    if (!trackingId) return;

    // Carregar script GA
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    script.async = true;
    document.head.appendChild(script);

    // Inicializar GA
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", trackingId);

    // Rastrear navegação SPA
    const handleRouteChange = (url: string) => {
      gtag("config", trackingId, { page_path: url });
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [trackingId, router.events]);
}

// Métricas customizadas para negócio
export interface BusinessMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: { name: string; sales: number }[];
  monthlyRevenue: number;
  profitMargin: number;
}

// Função para calcular métricas customizadas
export function calculateBusinessMetrics(orders: any[], products: any[]): BusinessMetrics {
  const completedOrders = orders.filter(o => o.status === "entregue");
  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = completedOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Produtos mais vendidos
  const productSalesMap: Record<string, number> = {};
  completedOrders.forEach(order => {
    order.items.forEach((item: any) => {
      productSalesMap[item.productName] = (productSalesMap[item.productName] || 0) + item.quantity;
    });
  });

  const topProducts = Object.entries(productSalesMap)
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // Receita mensal (exemplo simples)
  const monthlyRevenue = totalSales; // Pode ser refinado por período

  // Margem de lucro (exemplo simples)
  const totalCost = completedOrders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum: number, item: any) => {
      const product = products.find(p => p.name === item.productName);
      return itemSum + (product ? product.cost * item.quantity : 0);
    }, 0);
  }, 0);

  const profitMargin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

  return {
    totalSales,
    totalOrders,
    averageOrderValue,
    topProducts,
    monthlyRevenue,
    profitMargin
  };
}

// Previsão de demanda com ML (exemplo simples usando TensorFlow.js)
import * as tf from '@tensorflow/tfjs';

export async function trainDemandPredictionModel(salesData: number[]) {
  // Modelo simples de rede neural para previsão
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 50, activation: 'relu', inputShape: [1] }));
  model.add(tf.layers.dense({ units: 50, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  const xs = tf.tensor2d(salesData.map((_, i) => [i]));
  const ys = tf.tensor2d(salesData.map(y => [y]));

  await model.fit(xs, ys, { epochs: 100 });

  return model;
}

export async function predictDemand(model: tf.LayersModel, nextPeriodIndex: number) {
  const input = tf.tensor2d([[nextPeriodIndex]]);
  const prediction = model.predict(input) as tf.Tensor;
  const value = (await prediction.data())[0];
  return value;
}

// Análise de lucratividade por produto
export function analyzeProfitability(orders: any[], products: any[]) {
  const profitabilityMap: Record<string, { revenue: number; cost: number; profit: number }> = {};

  orders.forEach(order => {
    order.items.forEach((item: any) => {
      const product = products.find(p => p.name === item.productName);
      if (!product) return;

      if (!profitabilityMap[item.productName]) {
        profitabilityMap[item.productName] = { revenue: 0, cost: 0, profit: 0 };
      }

      profitabilityMap[item.productName].revenue += item.totalPrice;
      profitabilityMap[item.productName].cost += product.cost * item.quantity;
      profitabilityMap[item.productName].profit = profitabilityMap[item.productName].revenue - profitabilityMap[item.productName].cost;
    });
  });

  return Object.entries(profitabilityMap).map(([name, data]) => ({
    name,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.profit,
    profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
  })).sort((a, b) => b.profit - a.profit);
}
