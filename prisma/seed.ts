import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing tables (order matters for foreign keys)
  await prisma.appointment.deleteMany();
  await prisma.staffTimeOff.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.business.deleteMany();

  console.log("🧹 Cleaned database tables.");

  // 1. Business: Luxe Studio Barbershop
  const luxeBusiness = await prisma.business.create({
    data: {
      name: "Luxe Studio Barbershop",
      slug: "luxe-studio",
      description: "Premium grooming, master haircuts, and hot towel shave treatments in Downtown.",
      timezone: "America/New_York",
      ownerUserId: "owner-demo",
      currency: "USD",
    },
  });

  // Services for Luxe Studio
  const svcClassicCut = await prisma.service.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Classic Haircut & Styling",
      description: "Precision shear or clipper cut tailored to your face shape, includes rinse & styling.",
      durationMin: 30,
      priceCents: 3500,
      bufferMin: 10,
      color: "#6366f1", // Indigo
    },
  });

  const svcBeardTrim = await prisma.service.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Beard Sculpting & Hot Towel",
      description: "Detailed beard shaping, foil razor lineup, and eucalyptus hot towel treatment.",
      durationMin: 20,
      priceCents: 2500,
      bufferMin: 5,
      color: "#06b6d4", // Cyan
    },
  });

  const svcExecutive = await prisma.service.create({
    data: {
      businessId: luxeBusiness.id,
      name: "The Executive Package",
      description: "Signature haircut, beard sculpting, energizing shampoo, scalp massage, and hot towel shave.",
      durationMin: 60,
      priceCents: 7500,
      bufferMin: 15,
      color: "#8b5cf6", // Purple
    },
  });

  const svcColor = await prisma.service.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Color Camo & Gray Blending",
      description: "Natural-looking gray coverage and beard color tone blending.",
      durationMin: 45,
      priceCents: 5500,
      bufferMin: 10,
      color: "#ec4899", // Pink
    },
  });

  // Staff 1: Marcus Vance
  const staffMarcus = await prisma.staff.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Marcus Vance",
      email: "marcus@luxestudio.com",
      role: "Owner / Master Barber",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      active: true,
    },
  });

  // Staff 2: Elena Rostova
  const staffElena = await prisma.staff.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Elena Rostova",
      email: "elena@luxestudio.com",
      role: "Senior Stylist & Colorist",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      active: true,
    },
  });

  // Working hours for Marcus (Mon–Fri 9:00am–5:30pm -> 540 to 1050; Sat 10:00am–4:00pm -> 600 to 960)
  const weekdaysMarcus = [1, 2, 3, 4, 5];
  for (const day of weekdaysMarcus) {
    await prisma.workingHours.create({
      data: {
        staffId: staffMarcus.id,
        weekday: day,
        startMin: 540, // 9:00 AM
        endMin: 1050, // 5:30 PM
      },
    });
  }
  await prisma.workingHours.create({
    data: {
      staffId: staffMarcus.id,
      weekday: 6, // Saturday
      startMin: 600, // 10:00 AM
      endMin: 960, // 4:00 PM
    },
  });

  // Working hours for Elena (Tue–Sat 10:00am–6:00pm -> 600 to 1080)
  const weekdaysElena = [2, 3, 4, 5, 6];
  for (const day of weekdaysElena) {
    await prisma.workingHours.create({
      data: {
        staffId: staffElena.id,
        weekday: day,
        startMin: 600, // 10:00 AM
        endMin: 1080, // 6:00 PM
      },
    });
  }

  // Customers for Luxe Studio
  const customerJordan = await prisma.customer.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Jordan Smith",
      email: "jordan.smith@example.com",
      phone: "+1 (555) 234-5678",
      notes: "Prefers low fade with #2 guard on top.",
    },
  });

  const customerDavid = await prisma.customer.create({
    data: {
      businessId: luxeBusiness.id,
      name: "David Miller",
      email: "david.m@example.com",
      phone: "+1 (555) 876-5432",
    },
  });

  const customerSarah = await prisma.customer.create({
    data: {
      businessId: luxeBusiness.id,
      name: "Sarah Jenkins",
      email: "sarah.j@example.com",
      phone: "+1 (555) 432-1098",
    },
  });

  // Appointments for today
  const now = new Date();
  const today10am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0); // 10am EDT is 14:00 UTC
  const today10_30am = new Date(today10am.getTime() + 30 * 60000);

  const today11_30am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0);
  const today12_30pm = new Date(today11_30am.getTime() + 60 * 60000);

  const today2pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
  const today2_45pm = new Date(today2pm.getTime() + 45 * 60000);

  await prisma.appointment.create({
    data: {
      businessId: luxeBusiness.id,
      staffId: staffMarcus.id,
      serviceId: svcClassicCut.id,
      customerId: customerJordan.id,
      startsAt: today10am,
      endsAt: today10_30am,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      notes: "Regular monthly maintenance cut.",
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: luxeBusiness.id,
      staffId: staffMarcus.id,
      serviceId: svcExecutive.id,
      customerId: customerDavid.id,
      startsAt: today11_30am,
      endsAt: today12_30pm,
      status: "CONFIRMED",
      paymentStatus: "DEPOSIT_PAID",
      notes: "Wedding groomsman preparation.",
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: luxeBusiness.id,
      staffId: staffElena.id,
      serviceId: svcColor.id,
      customerId: customerSarah.id,
      startsAt: today2pm,
      endsAt: today2_45pm,
      status: "CONFIRMED",
      paymentStatus: "NONE",
    },
  });

  // 2. Second Business: Aura Wellness & Physical Therapy
  const auraBusiness = await prisma.business.create({
    data: {
      name: "Aura Wellness & Physiotherapy",
      slug: "aura-wellness",
      description: "Holistic physiotherapy, sports injury rehabilitation, and therapeutic clinical massage.",
      timezone: "America/Los_Angeles",
      ownerUserId: "owner-demo",
      currency: "USD",
    },
  });

  const auraSvcPT = await prisma.service.create({
    data: {
      businessId: auraBusiness.id,
      name: "Initial Physiotherapy Assessment",
      description: "Full biomechanical evaluation, mobility screening, and personalized treatment roadmap.",
      durationMin: 60,
      priceCents: 12000,
      bufferMin: 15,
      color: "#10b981", // Emerald
    },
  });

  const auraSvcMassage = await prisma.service.create({
    data: {
      businessId: auraBusiness.id,
      name: "Deep Tissue & Sports Recovery Massage",
      description: "Targeted myofascial release to relieve chronic pain and improve athletic recovery.",
      durationMin: 60,
      priceCents: 9500,
      bufferMin: 15,
      color: "#f59e0b", // Amber
    },
  });

  const staffChloe = await prisma.staff.create({
    data: {
      businessId: auraBusiness.id,
      name: "Dr. Chloe Bennett, DPT",
      email: "chloe@aurawellness.com",
      role: "Lead Doctor of Physical Therapy",
      avatarUrl: "https://images.unsplash.com/photo-1594824813581-2292f768b449?w=150&auto=format&fit=crop&q=80",
      active: true,
    },
  });

  for (let day = 1; day <= 5; day++) {
    await prisma.workingHours.create({
      data: {
        staffId: staffChloe.id,
        weekday: day,
        startMin: 480, // 8:00 AM
        endMin: 960, // 4:00 PM
      },
    });
  }

  console.log("✅ Database seeded successfully!");
  console.log(`- Created Business 1: ${luxeBusiness.name} (slug: ${luxeBusiness.slug})`);
  console.log(`- Created Business 2: ${auraBusiness.name} (slug: ${auraBusiness.slug})`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
