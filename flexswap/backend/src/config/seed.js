/**
 * Seed card type catalog into the in-memory store.
 * In production, replace with a PostgreSQL INSERT ON CONFLICT DO NOTHING seed migration.
 */
const seedCardTypes = (cardTypesMap) => {
  const cards = [
    { id: "1", name: "Amazon",         category: "Shopping",      icon: "🛒", color: "#FF9900", rate: 0.87, change: 2.3,  volume: 4200000, listings: 142 },
    { id: "2", name: "iTunes / Apple", category: "Entertainment", icon: "🎵", color: "#FC3C44", rate: 0.82, change: -0.8, volume: 2800000, listings: 89  },
    { id: "3", name: "Steam",          category: "Gaming",        icon: "🎮", color: "#1B2838", rate: 0.79, change: 1.1,  volume: 1900000, listings: 67  },
    { id: "4", name: "Google Play",    category: "Apps",          icon: "▶",  color: "#34A853", rate: 0.81, change: 0.5,  volume: 1500000, listings: 54  },
    { id: "5", name: "Walmart",        category: "Shopping",      icon: "🛍", color: "#0071CE", rate: 0.83, change: 3.1,  volume: 980000,  listings: 38  },
    { id: "6", name: "Netflix",        category: "Entertainment", icon: "🎬", color: "#E50914", rate: 0.76, change: -1.2, volume: 760000,  listings: 29  },
    { id: "7", name: "Visa Prepaid",   category: "Prepaid",       icon: "💳", color: "#1A1F71", rate: 0.91, change: 4.2,  volume: 5100000, listings: 203 },
    { id: "8", name: "eBay",           category: "Shopping",      icon: "📦", color: "#E53238", rate: 0.80, change: 0.9,  volume: 640000,  listings: 22  },
  ];
  cards.forEach(c => cardTypesMap.set(c.id, { ...c, baseRate: c.rate }));
  console.log(`[Seed] Loaded ${cards.length} card types`);
};

module.exports = { seedCardTypes };
