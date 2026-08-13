/* exported AnteData, getAnteData */
// AnteData.js - Trial names and the score curve.
// Boss blinds are NOT here: BlindDirector rolls one per trial from its own catalog.
// First ante: 200. Progression scaled from original 300-base curve (~2/3).

const AnteData = [
    { name: "The Fool", scoreThreshold: 200 },              // Linear start
    { name: "The Magician", scoreThreshold: 300 },          // +100
    { name: "The High Priestess", scoreThreshold: 400 },    // +100
    { name: "The Empress", scoreThreshold: 600 },           // +200 - Balatro-style ramp!
    { name: "The Emperor", scoreThreshold: 830 },           // +230 - Exponential!
    { name: "The Hierophant", scoreThreshold: 1130 },       // +300
    { name: "The Chariot", scoreThreshold: 1530 },          // +400
    { name: "Strength", scoreThreshold: 2070 },             // +540 - Getting hard!
    { name: "The Hermit", scoreThreshold: 2800 },           // +730
    { name: "Wheel of Fortune", scoreThreshold: 3800 },     // +1000
    { name: "Justice", scoreThreshold: 5130 },              // +1330
    { name: "The Hanged Man", scoreThreshold: 7000 }        // +1870 - BRUTAL! (showdown: The Eye)
];

// Helper function to get ante data by index
function getAnteData(anteIndex) {
    return AnteData[anteIndex] || AnteData[AnteData.length - 1];
}
