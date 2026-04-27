import { Circle, Square, Heart, Star } from "lucide-react";

export const SHAPE_OPTIONS = [
  { id: "circle", label: "Circle", icon: Circle },
  { id: "square", label: "Square", icon: Square },
  { id: "heart", label: "Heart", icon: Heart },
  { id: "star", label: "Star", icon: Star },
];

export const BURST_TYPES = [
  { id: "cannon", label: "🎯 Cannon", value: "cannon" },
  { id: "fireworks", label: "✨ Fireworks", value: "fireworks" },
  { id: "pride", label: "🌈 Pride", value: "pride" },
  { id: "snow", label: "❄️ Snow", value: "snow" },
];

// 🆕 Background effects — rendered via canvas animation (not confetti library)
export const BACKGROUND_EFFECTS = [
  { id: "none", label: "None", emoji: "🚫" },
  { id: "balloons", label: "Balloons", emoji: "🎈" },
  { id: "petals", label: "Petals", emoji: "🌸" },
  { id: "sparks", label: "Fire Sparks", emoji: "🔥" },
  { id: "money", label: "Money Rain", emoji: "💸" },
];

export const PREDEFINED_CONFETTI = [
  {
    id: "p1",
    type: "confetti",
    title: "Midnight Stars",
    particleCount: 200,
    shapes: ["star"],
    colors: ["#2c3e50", "#f1c40f"],
    burstType: "fireworks",
    gravity: 1.0,
    spread: 90,
    isPredefined: true,
  },
  {
    id: "p2",
    type: "confetti",
    title: "Rainbow Splash",
    particleCount: 300,
    shapes: ["circle", "square"],
    colors: ["#FF0000", "#00FF00", "#0000FF", "#FFD700", "#FF69B4"],
    burstType: "pride",
    gravity: 0.8,
    spread: 120,
    isPredefined: true,
  },
  {
    id: "p3",
    type: "confetti",
    title: "Celebration Gold",
    particleCount: 250,
    shapes: ["circle"],
    colors: ["#FFD700", "#FFA500", "#FF6347", "#FF69B4"],
    burstType: "cannon",
    gravity: 1.2,
    spread: 80,
    isPredefined: true,
  },
  {
    id: "p4",
    type: "confetti",
    title: "Sale Celebration",
    particleCount: 250,
    shapes: ["square", "circle"],
    colors: ["#FF5733", "#FFC300", "#C70039", "#900C3F"], // High-energy reds and yellows
    burstType: "cannon",
    gravity: 1.1,
    spread: 100,
    isPredefined: true,
  },
  {
    id: "p5",
    type: "confetti",
    title: "Birthday Offer",
    particleCount: 180,
    shapes: ["circle", "star"],
    colors: ["#FF69B4", "#87CEEB", "#FFD700", "#DA70D6", "#00FA9A"], // Fun, bright pastels
    burstType: "default",
    gravity: 0.7, // Slightly lighter gravity for a "floaty" feel
    spread: 80,
    isPredefined: true,
  },
  {
    id: "p6",
    type: "confetti",
    title: "Festival Blast",
    particleCount: 350, // Extra dense for that big "festival" look
    shapes: ["star"],
    colors: ["#FF4500", "#FFD700", "#FFFFFF", "#7B68EE", "#FF1493"], // Vibrant sparks
    burstType: "fireworks", // This matches your switch case logic!
    gravity: 1.0,
    spread: 120,
    isPredefined: true,
  },
];

// 🎫 UPDATED — Both vouchers same UI but different physics/colors
export const PREDEFINED_VOUCHERS = [
  {
    id: "v1",
    type: "voucher",
    title: "10% Welcome Discount",
    code: "WELCOME10",
    particleCount: 150,
    colors: ["#FFB396"],
    burstType: "fireworks",
    gravity: 1.0,
    spread: 70,
    isPredefined: true,
  },
  {
    id: "v2",
    type: "voucher",
    title: "Free Shipping Voucher",
    code: "FREESHIP",
    particleCount: 180,
    colors: ["#FF6B9D", "#C44569"],
    burstType: "cannon",
    gravity: 1.1,
    spread: 75,
    isPredefined: true,
  },
];
