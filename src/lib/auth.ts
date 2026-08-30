import db from "@/lib/db";

export interface DemoSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
  activeBusinessId?: string;
}

export async function getCurrentUser() {
  return {
    id: "owner-demo",
    name: "Alex Vance",
    email: "alex@example.com",
  };
}

export async function getActiveBusiness(customSlugOrId?: string) {
  if (customSlugOrId) {
    const business = await db.business.findFirst({
      where: {
        OR: [{ id: customSlugOrId }, { slug: customSlugOrId }],
      },
      include: {
        services: { where: { active: true } },
        staff: {
          where: { active: true },
          include: { workingHours: true },
        },
      },
    });
    if (business) return business;
  }

  // Otherwise return the first business or null
  return await db.business.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      services: { where: { active: true } },
      staff: {
        where: { active: true },
        include: { workingHours: true },
      },
    },
  });
}
