// Example model file
// Define your data models/schemas here

export interface ExampleModel {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export class Example {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: ExampleModel) {
        this.id = data.id;
        this.name = data.name;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}
