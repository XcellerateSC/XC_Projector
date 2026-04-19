import { createClient } from "@supabase/supabase-js";

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const defaultPassword = process.env.DEMO_DEFAULT_PASSWORD || "ProjectorDemo123!";

const demoUsers = [
  {
    email: "demo.pl1@xcellerate-projector.local",
    fullName: "Lena Fischer",
    jobTitle: "Project Lead"
  },
  {
    email: "demo.pl2@xcellerate-projector.local",
    fullName: "David Meier",
    jobTitle: "Project Lead"
  },
  {
    email: "demo.sc1@xcellerate-projector.local",
    fullName: "Alex Weber",
    jobTitle: "Senior Consultant"
  },
  {
    email: "demo.sc2@xcellerate-projector.local",
    fullName: "Sam Keller",
    jobTitle: "Senior Consultant"
  },
  {
    email: "demo.sc3@xcellerate-projector.local",
    fullName: "Nora Baumann",
    jobTitle: "Senior Consultant"
  },
  {
    email: "demo.c1@xcellerate-projector.local",
    fullName: "Mia Roth",
    jobTitle: "Consultant"
  },
  {
    email: "demo.c2@xcellerate-projector.local",
    fullName: "Luca Steiner",
    jobTitle: "Consultant"
  },
  {
    email: "demo.c3@xcellerate-projector.local",
    fullName: "Eva Brunner",
    jobTitle: "Consultant"
  },
  {
    email: "demo.c4@xcellerate-projector.local",
    fullName: "Jonas Frei",
    jobTitle: "Consultant"
  }
];

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listAllUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw error;
    }

    const batch = data.users ?? [];
    allUsers.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

async function ensureUser(existingUsersByEmail, user) {
  const existingUser = existingUsersByEmail.get(user.email);

  if (!existingUser) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      password: defaultPassword,
      user_metadata: {
        full_name: user.fullName,
        job_title: user.jobTitle
      }
    });

    if (error) {
      throw error;
    }

    return {
      action: "created",
      email: user.email,
      id: data.user?.id ?? "unknown",
      password: defaultPassword
    };
  }

  const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
    email_confirm: true,
    password: defaultPassword,
    user_metadata: {
      ...(existingUser.user_metadata ?? {}),
      full_name: user.fullName,
      job_title: user.jobTitle
    }
  });

  if (error) {
    throw error;
  }

  return {
    action: "updated",
    email: user.email,
    id: existingUser.id,
    password: defaultPassword
  };
}

const existingUsers = await listAllUsers();
const existingUsersByEmail = new Map(
  existingUsers.map((user) => [user.email?.toLowerCase() ?? "", user])
);

const results = [];

for (const user of demoUsers) {
  const result = await ensureUser(existingUsersByEmail, {
    ...user,
    email: user.email.toLowerCase()
  });
  results.push(result);
}

console.log("");
console.log("Demo users prepared for Xcellerate Projector:");
console.table(
  results.map((result) => ({
    action: result.action,
    email: result.email,
    password: result.password
  }))
);

console.log("Next step:");
console.log("- Replace the PM email placeholder in supabase/sql/seed_demo_workspace.sql");
console.log("- Run the SQL seed in the Supabase SQL editor");
