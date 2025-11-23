import mongoose from "mongoose";

const whatsappTemplateSchema = new mongoose.Schema({
  text: { type: String, required: true }, // can contain emojis + line breaks
  createdAt: { type: Date, default: Date.now },
});

const WhatsAppTemplate = mongoose.model("WhatsAppTemplate", whatsappTemplateSchema);
export default WhatsAppTemplate;
