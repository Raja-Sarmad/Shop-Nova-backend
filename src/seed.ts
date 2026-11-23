import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { User } from "./models/User.js";
import { Product } from "./models/Product.js";
import { Collection } from "./models/Collection.js";

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

async function seed() {
  await connectDb();

  const adminEmail = env.admin.email.toLowerCase();
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: env.admin.name,
      email: adminEmail,
      password: env.admin.password,
      role: "admin",
    });
    console.log(`Admin created: ${adminEmail} / ${env.admin.password}`);
  } else {
    admin.role = "admin";
    await admin.save();
    console.log(`Admin already exists: ${adminEmail}`);
  }

  const demoCustomer = await User.findOne({ email: "customer@shopnova.pk" });
  if (!demoCustomer) {
    await User.create({
      name: "Demo Customer",
      email: "customer@shopnova.pk",
      password: "Customer@123",
      role: "customer",
      phone: "+92 300 111 2233",
    });
    console.log("Demo customer: customer@shopnova.pk / Customer@123");
  }

  const collections = [
    {
      slug: "signature-scents",
      title: "Signature Scents",
      eyebrow: "Fragrance",
      description: "Eau de parfum and body mists for every hour.",
      image: { url: u("photo-1594035910387-fea47794261f"), publicId: "" },
      featured: true,
    },
    {
      slug: "everyday-steps",
      title: "Everyday Steps",
      eyebrow: "Shoes",
      description: "Sneakers, loafers, and boots for the city.",
      image: { url: u("photo-1549298916-b41d501d3772"), publicId: "" },
      featured: true,
    },
    {
      slug: "after-hours",
      title: "After Hours",
      eyebrow: "Evening",
      description: "Darker notes and sharper silhouettes.",
      image: { url: u("photo-1543163521-1bf539c55dd2"), publicId: "" },
      featured: true,
    },
  ];

  for (const c of collections) {
    await Collection.findOneAndUpdate({ slug: c.slug }, c, {
      upsert: true,
      new: true,
    });
  }

  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      {
        name: "Noir Velvet Eau de Parfum",
        slug: "noir-velvet-edp",
        subtitle: "50ml · unisex",
        description: "Smoked amber, blackcurrant, and soft musk.",
        price: 28500,
        compareAtPrice: 32000,
        category: "fragrance",
        collectionSlug: "signature-scents",
        images: [{ url: u("photo-1594035910387-fea47794261f"), publicId: "" }],
        colors: [{ name: "Noir", hex: "#1A1614" }],
        sizes: ["50ml"],
        tags: ["perfume"],
        stockQuantity: 30,
        inStock: true,
        gender: "unisex",
        isNew: true,
        isBestseller: true,
        fabric: "Eau de Parfum",
        care: ["Store away from sunlight"],
        details: ["Long lasting", "Made for warm climates"],
        isPublished: true,
        createdBy: admin._id,
      },
      {
        name: "Citrus Grove Mist",
        slug: "citrus-grove-mist",
        subtitle: "100ml body mist",
        description: "Bergamot, orange blossom, and clean cedar.",
        price: 7600,
        category: "fragrance",
        gender: "women",
        collectionSlug: "signature-scents",
        images: [{ url: u("photo-1615634260167-c8cdede054de"), publicId: "" }],
        colors: [{ name: "Citrus", hex: "#E8C96A" }],
        sizes: ["100ml"],
        tags: ["mist"],
        stockQuantity: 45,
        inStock: true,
        isNew: true,
        fabric: "Body mist",
        care: ["Shake gently"],
        details: ["Light sillage"],
        isPublished: true,
        createdBy: admin._id,
      },
      {
        name: "Canvas Court Sneaker",
        slug: "canvas-court-sneaker",
        subtitle: "Organic canvas + gum sole",
        description: "A quiet low court sneaker for daily wear.",
        price: 11900,
        category: "shoes",
        gender: "men",
        collectionSlug: "everyday-steps",
        images: [{ url: u("photo-1549298916-b41d501d3772"), publicId: "" }],
        colors: [
          { name: "Ecru", hex: "#E8DED0" },
          { name: "Noir", hex: "#1A1614" },
        ],
        sizes: ["36", "37", "38", "39", "40", "41", "42"],
        tags: ["sneakers"],
        stockQuantity: 22,
        inStock: true,
        isBestseller: true,
        fabric: "Organic cotton canvas",
        care: ["Spot clean"],
        details: ["Gum rubber outsole"],
        isPublished: true,
        createdBy: admin._id,
      },
      {
        name: "Espresso Leather Loafer",
        slug: "espresso-leather-loafer",
        subtitle: "Hand-burnished calf",
        description: "Slim penny loafer with stacked leather heel.",
        price: 17900,
        category: "shoes",
        gender: "men",
        collectionSlug: "everyday-steps",
        images: [{ url: u("photo-1614252235816-8c852fd85888"), publicId: "" }],
        colors: [
          { name: "Espresso", hex: "#3B2A22" },
          { name: "Cognac", hex: "#8A5A32" },
        ],
        sizes: ["36", "37", "38", "39", "40", "41"],
        tags: ["leather"],
        stockQuantity: 14,
        inStock: true,
        isBestseller: true,
        fabric: "Full-grain calf leather",
        care: ["Condition seasonally"],
        details: ["Leather sole", "3cm heel"],
        isPublished: true,
        createdBy: admin._id,
      },
      {
        name: "Suede Ankle Boot",
        slug: "suede-ankle-boot",
        subtitle: "Calf suede, stacked heel",
        description: "Pull-on ankle boot with a soft almond toe.",
        price: 19900,
        category: "shoes",
        gender: "women",
        collectionSlug: "after-hours",
        images: [{ url: u("photo-1543163521-1bf539c55dd2"), publicId: "" }],
        colors: [
          { name: "Taupe", hex: "#8B7764" },
          { name: "Noir", hex: "#1A1614" },
        ],
        sizes: ["36", "37", "38", "39", "40", "41"],
        tags: ["boots"],
        stockQuantity: 8,
        inStock: true,
        isNew: true,
        fabric: "Calf suede",
        care: ["Suede brush"],
        details: ["5cm heel"],
        isPublished: true,
        createdBy: admin._id,
      },
    ]);
    console.log("Sample products inserted.");
  } else {
    console.log(`Products already present (${count}). Skipping product seed.`);
  }

  console.log("\nSeed complete.");
  console.log("──────────────");
  console.log(`ADMIN     ${adminEmail} / ${env.admin.password}`);
  console.log("CUSTOMER  customer@shopnova.pk / Customer@123");
  console.log("──────────────");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
