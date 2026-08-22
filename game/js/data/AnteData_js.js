/* exported AnteData, getAnteData */
// AnteData.js - Trial names and the score curve.
// Boss blinds are NOT here: BlindDirector rolls one per trial from its own catalog.
// Favour is 100-based (Pips × Favour), so the old 200-base curve is ×100.

const AnteData = [
    { name: "The Fool", scoreThreshold: 20000 },
    { name: "The Magician", scoreThreshold: 30000 },
    { name: "The High Priestess", scoreThreshold: 40000 },
    { name: "The Empress", scoreThreshold: 60000 },
    { name: "The Emperor", scoreThreshold: 83000 },
    { name: "The Hierophant", scoreThreshold: 113000 },
    { name: "The Chariot", scoreThreshold: 153000 },
    { name: "Strength", scoreThreshold: 207000 },
    { name: "The Hermit", scoreThreshold: 280000 },
    { name: "Wheel of Fortune", scoreThreshold: 380000 },
    { name: "Justice", scoreThreshold: 513000 },
    { name: "The Hanged Man", scoreThreshold: 700000 }
];

// Helper function to get ante data by index
function getAnteData(anteIndex) {
    return AnteData[anteIndex] || AnteData[AnteData.length - 1];
}
