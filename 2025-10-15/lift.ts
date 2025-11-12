type Direction = 'up' | 'down' | null;


interface FloorCall {
    floor: number;
    direction: Direction;
}


class Elevator {
    // Variablen definieren: aktuelle Etage des Aufzugs
    private currentFloor: number;
    // ob die Türen des Aufzugs geöffnet sind
    private doorsOpen: boolean;
    // Setter: Etagen, die von Passagieren im Aufzug angefordert wurden
    private floorRequests: Set<number>;
    // Array von Requests, die von einzelnen Etagen getätigt wurden 
    private floorCalls: FloorCall[];
    // Gesamtanzahl der Etagen im Gebäude
    private numFloors: number;
    // aktuelle Bewegungsrichtung: 'up', 'down' oder null, wenn der Aufzug steht
    private direction: Direction;

    
    constructor(numFloors: number, initialFloor: number = 0) {
        this.numFloors = numFloors;
        this.currentFloor = initialFloor;
        this.doorsOpen = false; //Tür zu
        this.floorRequests = new Set(); 
        this.floorCalls = []; 
        this.direction = null; 
    }

    // Helper to wait for a given number of milliseconds. We use this to
    // simulate time taken to move between floors and to open/close doors.
    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Personen im Aufzug wählen Etage
    requestFloor(floor: number) {
        if (floor >= 0 && floor < this.numFloors) {
            this.floorRequests.add(floor);
        }
    }

    // Personen rufen Aufzug 
    callElevator(floor: number, direction: Direction) {
        if (
            floor >= 0 &&
            floor < this.numFloors &&
            (direction === 'up' || direction === 'down')
        ) {
            this.floorCalls.push({ floor, direction });
        }
    }

    // Tür öffnen: dauert 1 Sekunde 
    async openDoors() {
        await this.sleep(1000); 
        this.doorsOpen = true;
    }

    // Tür schließen: dauert 1 Sekunde
    async closeDoors() {
        await this.sleep(1000); 
        this.doorsOpen = false;
    }

    async step() {
        if (this.doorsOpen) {
            return;
        }

        const nextFloor = this.getNextTargetFloor();

        if (nextFloor === null) {
            this.direction = null;
            return;
        }

        if (nextFloor > this.currentFloor) {
            this.direction = 'up';
            await this.sleep(3000);
            this.currentFloor++;
        } else if (nextFloor < this.currentFloor) {
            this.direction = 'down';
            await this.sleep(3000);
            this.currentFloor--;
        } else {
            await this.openDoors();
            this.fulfillRequestsAndCalls();
            this.direction = null; 
        }
    }

    // Determine next floor to target. Currently uses a simple heuristic:
    // combine internal requests and external calls, and pick the closest
    // floor to the current position. Returns null if there are no targets.
    private getNextTargetFloor(): number | null {
        // Merge all requested floors (from inside) and all call floors (from
        // outside) into a single list of candidate targets.
        const allTargets = [
            ...Array.from(this.floorRequests),
            ...this.floorCalls.map(call => call.floor),
        ];
        if (allTargets.length === 0) return null;

        // Find the candidate with the smallest absolute distance to currentFloor
        let minDist = this.numFloors;
        let target: number | null = null;
        for (const floor of allTargets) {
            const dist = Math.abs(floor - this.currentFloor);
            if (dist < minDist) {
                minDist = dist;
                target = floor;
            }
        }
        return target;
    }

    private fulfillRequestsAndCalls() {
        this.floorRequests.delete(this.currentFloor);
        this.floorCalls = this.floorCalls.filter(
            call =>
                !(
                    call.floor === this.currentFloor &&
                    (this.direction === null || call.direction === this.direction)
                )
        );
    }

    getCurrentFloor() {
        return this.currentFloor;
    }

    areDoorsOpen() {
        return this.doorsOpen;
    }

    getDirection() {
        return this.direction;
    }
}

export { Elevator };
export type { Direction, FloorCall };