import { PrismaClient } from "model";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const ensurePassengers = 20000;
const ensureAirports = 100;
const ensurePlanes = 250;
const ensureFlights = 2000;

console.log("Starting seeder — this may take a while for large counts...");

// helper
function rnd<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// pick N unique passenger ids from an array (module-level helper)
function pickUniquePassengersFrom(passengersArr: { id: string }[], n: number) {
    const result: { id: string }[] = [];
    const used = new Set<string>();
    while (result.length < n) {
        const p = passengersArr[Math.floor(Math.random() * passengersArr.length)];
        if (!used.has(p.id)) {
            used.add(p.id);
            result.push({ id: p.id });
        }
    }
    return result;
}

// --- Airports
let createdAirports = await prisma.airport.count();
if (createdAirports < ensureAirports) {
    while (createdAirports < ensureAirports) {
        try {
            const a = faker.airline.airport();
            const iata = (a?.iataCode ?? faker.string.alpha({ length: 3 })).toUpperCase();
            await prisma.airport.create({
                data: {
                    name: a?.name ?? `${iata} Airport`,
                    iataCode: iata,
                    city: a?.city ?? faker.location.city(),
                },
            });
        } catch (e) {
            const msg = (e as Error).message;
            if (!msg.includes("UNIQUE constraint failed") && !msg.includes("Unique constraint failed")) {
                console.error("Error creating airport:", msg);
            }
            // otherwise ignore duplicate iata and continue
        }
        createdAirports = await prisma.airport.count();
        if (createdAirports % 10 === 0) console.log(`Airports: ${createdAirports}/${ensureAirports}`);
    }
    console.log(`Airports now: ${await prisma.airport.count()}/${ensureAirports}`);
} else {
    console.log(`Airports already present: ${createdAirports}`);
}

// --- Planes
let createdPlanes = await prisma.plane.count();
if (createdPlanes < ensurePlanes) {
    while (createdPlanes < ensurePlanes) {
        try {
            const airplane = faker.airline.airplane();
            await prisma.plane.create({
                data: {
                    model: airplane?.name ?? faker.string.alpha({ length: 6 }),
                    capacity: faker.number.int({ min: 10, max: 850 }),
                },
            });
        } catch (e) {
            const msg = (e as Error).message;
            if (!msg.includes("UNIQUE constraint failed") && !msg.includes("Unique constraint failed")) {
                console.error("Error creating plane:", msg);
            }
        }
        createdPlanes = await prisma.plane.count();
        if (createdPlanes % 10 === 0) console.log(`Planes: ${createdPlanes}/${ensurePlanes}`);
    }
    console.log(`Planes now: ${await prisma.plane.count()}/${ensurePlanes}`);
} else {
    console.log(`Planes already present: ${createdPlanes}`);
}

// --- Passengers
const existingPassengers = await prisma.passenger.count();
if (existingPassengers < ensurePassengers) {
    const batchSize = 1000;
    let created = existingPassengers;
    while (created < ensurePassengers) {
        const toCreate = Math.min(batchSize, ensurePassengers - created);
        const data = new Array(toCreate).fill(0).map(() => {
            const first = faker.person.firstName();
            const last = faker.person.lastName();
            return {
                firstName: first,
                lastName: last,
                // include uuid to minimize collisions
                email: `${first}.${last}.${faker.string.uuid()}@example.com`.toLowerCase(),
            } as const;
        });
        try {
            await prisma.passenger.createMany({ data });
        } catch (e) {
            console.error("Error creating passenger batch:", (e as Error).message);
        }
        created = await prisma.passenger.count();
        console.log(`Passengers: ${created}/${ensurePassengers}`);
    }
} else {
    console.log(`Passengers already present: ${existingPassengers}`);
}

// --- Flights
// Load ids to sample from
const airports = (await prisma.airport.findMany({ select: { id: true } })) as { id: string }[];
const planes = (await prisma.plane.findMany({ select: { id: true, capacity: true } })) as { id: string; capacity: number }[];
const passengers = (await prisma.passenger.findMany({ select: { id: true } })) as { id: string }[];

if (airports.length < 2 || planes.length === 0 || passengers.length === 0) {
    console.error("Not enough data to create flights (need >=2 airports, >=1 plane, >=1 passenger)");
} else {
    const flights_to_create = Math.max(0, ensureFlights - (await prisma.flight.count()));
    console.log(`Will create ${flights_to_create} flights (airports=${airports.length}, planes=${planes.length}, passengers=${passengers.length})`);

    
    for (let i = 0; i < flights_to_create; i++) {
        try {
            const origin = rnd(airports);
            let destination = rnd(airports);
            let attempts = 0;
            while (destination.id === origin.id && attempts++ < 10) destination = rnd(airports);

            const plane = rnd(planes);

            const depart = new Date(Date.now() + faker.number.int({ min: 1, max: 90 }) * 24 * 60 * 60 * 1000);
            const arrive = new Date(depart.getTime() + faker.number.int({ min: 1, max: 12 }) * 60 * 60 * 1000);

            const maxPassengersOnThisFlight = Math.min(plane.capacity ?? 200, 200);
            const passengerCount = faker.number.int({ min: 0, max: Math.min(80, maxPassengersOnThisFlight) });
            const passengerConnect = passengerCount > 0 ? pickUniquePassengersFrom(passengers, passengerCount) : [];

            await prisma.flight.create({
                data: {
                    flightNumber: `${faker.string.alpha({ length: 2 }).toUpperCase()}${faker.number.int({ min: 100, max: 9999 })}`,
                    departureTime: depart,
                    arrivalTime: arrive,
                    origin: { connect: { id: origin.id } },
                    destination: { connect: { id: destination.id } },
                    plane: { connect: { id: plane.id } },
                    passengers: passengerConnect.length > 0 ? { connect: passengerConnect } : undefined,
                },
            });

            if ((i + 1) % 200 === 0) console.log(`Created ${i + 1}/${flights_to_create} flights...`);
        } catch (e) {
            console.error("Error creating flight:", (e as Error).message);
        }
    }
}

console.log("Seeding complete. Summary:");
console.log("Passengers:", await prisma.passenger.count());
console.log("Planes:", await prisma.plane.count());
console.log("Airports:", await prisma.airport.count());
console.log("Flights:", await prisma.flight.count());

await prisma.$disconnect();

