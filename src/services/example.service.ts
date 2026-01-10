// Example service file
// Add your business logic here

export class ExampleService {
    async getData(): Promise<any> {
        // Business logic here
        return { message: 'Service example' };
    }
}

export default new ExampleService();
