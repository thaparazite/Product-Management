const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname,'/../protos/product_management.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const product_management_proto = grpc.loadPackageDefinition(packageDefinition).product_management;

// Simulated database functions
const database = {
    products: [],
    getProductById: function (productId) {
        for (let i = 0; i < this.products.length; i++) {
            if (this.products[i].id === productId) {

                return this.products[i];
            }
        }
        return null;
    },
    getAllProducts: function () {
        return this.products;
    },
    addProduct: function (product) {
        const existingProduct = this.getProductById(product.id);
        if (existingProduct) {
            console.log(`Product with ID ${product.id} already exists.`);
            return false;
        }
        this.products.push(product);
        return true;
    },
    updateProductInventory: function (productId,quantityChange) {
        console.log(`Updating inventory for product ${productId} with change ${quantityChange}`);
        const product = this.getProductById(productId);

        console.log(`Product: ${JSON.stringify(product)}`);

        if (product) {
            product.quantity = Number(quantityChange);
            console.log(`Updated quantity of product ${productId} to ${product.quantity}`);
            return { success: true };
        } else {
            console.log(`Product with ID ${productId} not found`);
            return { success: false };
        }
    }

};

// simulate some data in the database
function getProductDetails(call,callback) {
    // get the product ID from the request
    const productId = String(call.request.productId);
    // get the product from the database
    const product = database.getProductById(productId);
    // send the product in the response or an error if the product is not found
    if (product) {
        callback(null,{ product: product });
    } else {
        // send a NOT_FOUND error if the product is not found
        callback({
            code: grpc.status.NOT_FOUND,
            details: 'Product not found'
        });// end of callback 
    }// end of if/else statement
}// end of getProductDetails function

// list all products in the database
function listAllProducts(call) {
    // get all products from the database
    const products = database.getAllProducts();
    // send each product in the response
    products.forEach(product => call.write(product));
    call.end();// end the call
}// end of listAllProducts function

// add a product to the database
function addProduct(call,callback) {
    let product;// variable to store the product data
    // listen for data from the client and add the product to the database
    call.on('data',function (request) {
        product = request.product;// get the product data from the request
        database.addProduct(product);// add the product to the database
    });
    // end the call and send a response to the client
    call.on('end',function () {
        // send a success message if the product was added
        if (product) {
            callback(null,{ success: true });
        } else {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                details: 'Product data not received'
            });// end of callback
        }// end of if/else statement
    });// end of call.on
}// end of addProduct function

// update the inventory of a product
function updateProductInventory(call) {
    let success = false;
    let message = '';

    // listen for data from the client and update the inventory of the product
    call.on('data',(request) => {
        // get the product ID and quantity change from the request
        const productId = String(request.productId);
        // get the quantity change from the request
        const quantityChange = request.quantityChange;
        // update the inventory of the product
        const result = database.updateProductInventory(productId,quantityChange);

        success = result.success;// get the success status from the result

        // send a response to the client
        if (!success) {
            message = `Failed to update inventory of product ${productId}. Product does not exist.`;
        }// end of if statement 
        // send a response to the client
        call.write({ success: success,message: message });

    });// end of call.on(data) function  

    // end the call and send a final response to the client
    call.on('end',() => {
        // send a final response to the client
        if (success) {
            call.write({ success: true,message: 'Inventory updated successfully' });
        } else {
            call.write({ success: false,message: message });
        }// end of if/else statement

        // signal that the server has finished writing responses
        call.end();
    });// end of call.on(end) function
}// end of updateProductInventory function

// create a new gRPC server 
const server = new grpc.Server();
// add the product management service to the server
server.addService(product_management_proto.ProductService.service,{
    GetProductDetails: getProductDetails,
    ListAllProducts: listAllProducts,
    AddProduct: addProduct,
    UpdateProductInventory: updateProductInventory
});// end of server.addService

// bind the server to the specified address and port
const SERVER_ADDRESS = '127.0.0.1:50051';

// start the server and listen for incoming connections
server.bindAsync(SERVER_ADDRESS,grpc.ServerCredentials.createInsecure(),(err,port) => {
    // check for errors and log the address the server is running on
    if (err) {
        console.error('Server bind failed:',err);
    } else {
        console.log(`Server running at ${SERVER_ADDRESS}`);
    }// end of if/else statement
});// end of server.bindAsync
