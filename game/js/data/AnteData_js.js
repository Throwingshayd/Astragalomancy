/* exported AnteData, getAnteData */
// AnteData.js - Trial names and the score curve.
// Boss blinds are NOT here: BlindDirector rolls one per trial from its own catalog.
// Score is pips × (favour/100), so a 20-pip naked hand is 20. Curve is the original 200-base.

const AnteData = [
    { name: "The Fool", scoreThreshold: 200 },
    { name: "The Magician", scoreThreshold: 300 },
    { name: "The High Priestess", scoreThreshold: 400 },
    { name: "The Empress", scoreThreshold: 600 },
    { name: "The Emperor", scoreThreshold: 830 },
    { name: "The Hierophant", scoreThreshold: 1130 },
    { name: "The Chariot", scoreThreshold: 1530 },
    { name: "Strength", scoreThreshold: 2070 },
    { name: "The Hermit", scoreThreshold: 2800 },
    { name: "Wheel of Fortune", scoreThreshold: 3800 },
    { name: "Justice", scoreThreshold: 5130 },
    { name: "The Hanged Man", scoreThreshold: 7000 }
];

// Helper function to get ante data by index
function getAnteData(anteIndex) {
    return AnteData[anteIndex] || AnteData[AnteData.length - 1];
}
