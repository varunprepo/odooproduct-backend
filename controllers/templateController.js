import WhatsAppTemplate from "../models/WhatsAppTemplate.js";

// Save new template
export const saveTemplate = async (req, res) => {
  try {

    /*res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://odooproductsfrontend.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }*/

    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Template text required" });

    // If a record exists, update it; otherwise, create a new one
    let template = await WhatsAppTemplate.findOne();
    if (template) {
      template.text = text;
      await template.save();
      res.status(200).json({ message: "Template updated successfully" });
      //res.status(200).json({ message: "Template updated successfully", data: template });
    } else {
      const newTemplate = new WhatsAppTemplate({ text });
      await newTemplate.save();
      res.status(201).json({ message: "Template created successfully", data: newTemplate });
    }

  } catch (err) {
    console.error("Save template error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get latest template
export const getTemplate = async (req, res) => {
  try {

    /*res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://odooproductsfrontend.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }*/
    const template = await WhatsAppTemplate.findOne().sort({ createdAt: -1 });
    if (!template) return res.status(404).json({ message: "No template found" });
    res.json(template);
  } catch (err) {
    console.error("Get template error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
