const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const readline = require('readline');

const PROTO_PATH = path.join(__dirname,'/../protos/product_management.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const product_management_proto = grpc.loadPackageDefinition(packageDefinition).product_management;

// create a client for the ProductService
const client = new product_management_proto.ProductService('127.0.0.1:50051',grpc.credentials.createInsecure());

// create a readline interface to read user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});// end of rl interface

// function to display the options menu
function displayOptions() {
    console.log('--------------------------------------');
    console.log('\t*** Product Manager ***');
    console.log('--------------------------------------');
    const options = 'Options:';
    console.log(options);
    for (let i = 0; i < options.length; i++) {
        process.stdout.write('-');
    }
    process.stdout.write('\n');
    console.log(' 1. Get Product Details');
    console.log(' 2. List All Products');
    console.log(' 3. Add Product');
    console.log(' 4. Update Product Inventory');
    console.log(' 5. Exit');
    console.log('--------------------------------------');
}// end of displayOptions function

// array to store products retrieved from the server
let products = []; // Store products retrieved from the server

// function to get product details by ID
function getProductDetails() {
    var text = 'Enter product ID: ';
    // prompt the user for the product ID
    rl.question(text,(productId) => {
        for (let i = 0; i < text.length + 1; i++) {
            process.stdout.write('-');
        }
        process.stdout.write('\n');
        // create a call to the ListAllProducts method
        const call = client.ListAllProducts({});
        // variable to store the product found
        let productFound = null;
        // listen for data events from the call
        call.on('data',(product) => {
            // check if the product ID matches the requested ID
            if (product.id === productId) {
                productFound = product;// store the product
                return; // Exit the callback
            }// end of if statement
        });// end of call.on data event
        // listen for the end event from the call
        call.on('end',() => {
            // check if a product was found
            if (productFound) {
                // display the product details
                console.table([productFound]);
            } else {
                // display a message if the product was not found
                console.log('No product found with ID:',productId);
            }// end of if statement
            main();// return to the main menu
        });/// end of call.on end event

        call.on('error',(error) => {
            console.error('Error:',error.message);
            handleDisconnection(); // Handle disconnection
        });// end of call.on error event

    });// end of rl.question function
}// end of getProductDetails function

// function to list all products
function listAllProducts() {
    // create a call to the ListAllProducts method
    const call = client.ListAllProducts({});
    // array to store the products
    products = [];
    // listen for data events from the call
    call.on('data',(product) => {
        products.push(product);// add the product to the array of products
    });
    // listen for the end event from the call
    call.on('end',() => {
        // check if there are products available
        if (products.length > 0) {
            console.table(products);// display the products in a table
        } else {
            console.log('No products available');
        }// end of if statement
        main();// return to the main menu
    });// end of call.on end event

    call.on('error',(error) => {
        console.error('Error:',error.message);
        handleDisconnection(); // Handle disconnection
    });// end of call.on error event

}// end of listAllProducts function

// function to prompt the user for the product price
function askForPrice(callback) {
    var text = 'Enter product price: ';
    // prompt the user for the product price
    rl.question(text,(price) => {
        for (let i = 0; i < text.length + price.length; i++) {
            process.stdout.write('-');
        }
        process.stdout.write('\n');
        // check if the price is a number
        if (isNaN(price)) {
            // display an error message if the price is not a number
            console.log('Invalid input. Price must be a number.');
            askForPrice(callback);// call the function again to prompt for input
        } else {
            callback(price);// call the callback function with the price
        }// end of if/else statement
    });// end of rl.question function
}// end of askForPrice function

// function to prompt the user for the product quantity
function askForQuantity(callback) {
    var text = 'Enter product quantity: ';
    // prompt the user for the product quantity
    rl.question(text,(quantity) => {
        for (let i = 0; i < text.length + quantity.length; i++) {
            process.stdout.write('-');
        }
        process.stdout.write('\n');
        // check if the quantity is a number
        if (isNaN(quantity)) {
            // display an error message if the quantity is not a number
            console.log('Invalid input. Quantity must be a number.');
            askForQuantity(callback);// call the function again to prompt for input
        } else {
            callback(quantity);// call the callback function with the quantity
        }// end of if/else statement
    });// end of rl.question function
}// end of askForQuantity function

// function to add a product
function addProduct() {
    var text = 'Enter product ID: ';
    //  prompt the user for the product ID
    rl.question(text,(id) => {
        for (let i = 0; i < text.length + 1; i++) {
            process.stdout.write('-');
        }
        process.stdout.write('\n');
        // check if the ID already exists
        const existingProduct = products.find(product => product.id === id);
        // display a message if the product already exists
        if (existingProduct) {
            // display a message if the product already exists
            console.log('Product with ID',id,'already exists.');
            main(); // return to the menu
            return;// exit the function
        }// end of if statement
        text = 'Enter product name: ';
        // prompt the user for the product name
        rl.question(text,(name) => {
            for (let i = 0; i < text.length + 1; i++) {
                process.stdout.write('-');
            }
            process.stdout.write('\n');
            // prompt the user for the product price
            askForPrice(price => {
                // prompt the user for the product quantity
                askForQuantity(quantity => {
                    // create a product object
                    const product = { id,name,price: parseFloat(price),quantity: parseInt(quantity) };
                    // create a call to the AddProduct method
                    const call = client.AddProduct((err,response) => {
                        // check for errors
                        if (err) {
                            // display an error message if there is an error
                            console.error('Error:',err.details);
                        } else {
                            // display a success message if the product was added successfully
                            console.log('Product Added:',response.success);
                        }// end of if/else statement
                        main();// return to the menu
                    });// end of call function

                    // send the product in the request
                    call.write({ product: product });
                    // end the call
                    call.end();
                });// end of askForQuantity function
            });// end of askForPrice function
        });// end of rl.question function
    });// end of rl.question function
}// end of addProduct function

// function to update the product inventory
function updateProductInventory() {
    var text = 'Enter product ID: ';
    // prompt the user for the product ID
    rl.question(text,(productId) => {
        for (let i = 0; i < text.length + 1; i++) {
            process.stdout.write('-');
        }
        process.stdout.write('\n');
        // check if the product exists
        const existingProduct = products.find(product => product.id === productId);
        // display a message if the product does not exist
        if (!existingProduct) {
            // display a message if the product does not exist
            console.log('Product with ID',productId,'does not exist.');
            main(); // return to the menu
            return;// exit the function
        }// end of if statement 
        text = 'Enter quantity change: ';
        // prompt the user for the quantity change
        rl.question(text,(quantityChange) => {
            for (let i = 0; i < text.length + quantityChange.length; i++) {
                process.stdout.write('-');
            }
            process.stdout.write('\n');
            // check if the quantity change is a number
            if (isNaN(quantityChange)) {
                // display an error message if the quantity change is not a number
                console.log('Invalid input. Quantity change must be a number.');
                updateProductInventory();// call itself again to prompt for input
                return;// exit the function
            }// end of if statement

            // create a call to the UpdateProductInventory method
            const call = client.updateProductInventory((err,response) => {
                // check for errors
                if (err) {
                    // display an error message if there is an error
                    console.error('Error:',err.details);
                    main(); // return to the menu
                    return;// exit the function
                }// end of if statement
                // display a success message if the inventory was updated
                if (response.success) {
                    // display a success message if the inventory was updated
                    console.log('Inventory updated successfully.');
                } else {
                    // display a message if the inventory was not updated
                    console.log('Failed to update inventory:',response.message);
                }// end of if/else statement
                main(); // return to the menu
            });// end of call function

            call.on('error',(error) => {
                console.error('Error:',error.message);
                handleDisconnection(); // Handle disconnection
            });

            // send the product ID and quantity change in the request
            call.write({ productId: productId,quantityChange: parseInt(quantityChange) }); // Convert quantityChange to integer
            console.log('Record updated successfully');
            main(); // return to the menu

        });// end of rl.question function
    });// end of rl.question function
}//

// Function to handle disconnection
function handleDisconnection() {
    var text = 'Disconnected from the server. Please check your network connection.';
    for (let i = 0; i < text.length; i++) {
        process.stdout.write('-');
    }// end of for loop
    process.stdout.write('\n');
    console.log(text);
    for (let i = 0; i < text.length; i++) {
        process.stdout.write('-');
    }// end of for loop
    process.stdout.write('\n');
    // exit the client
    process.exit(1); // Exit the client
}// end of handleDisconnection function

function main() {
    // display the options menu
    displayOptions();

    var text = 'Enter an option: ';

    // prompt the user for an option 
    rl.question(text,(option) => {
        for (let i = 0; i < text.length + option.length; i++) {
            process.stdout.write('-');
        }
        process.stdout.write('\n');
        // check the option selected by the user
        switch (option) {
            case '1':
                text = '1. Get Product Details';
                console.log(text);
                for (let i = 0; i < text.length; i++) {
                    process.stdout.write('-');
                }
                process.stdout.write('\n');
                getProductDetails();// get product details by ID    
                break;
            case '2':
                text = '2. List All Products';
                console.log(text);
                for (let i = 0; i < text.length; i++) {
                    process.stdout.write('-');
                }
                process.stdout.write('\n');
                listAllProducts();// list all products in the database
                break;
            case '3':
                text = '3. Add Product';
                console.log(text);
                for (let i = 0; i < text.length; i++) {
                    process.stdout.write('-');
                }
                process.stdout.write('\n');
                addProduct();// add a product to the database
                break;
            case '4':
                text = '4. Update Product Inventory';
                console.log(text);
                for (let i = 0; i < text.length; i++) {
                    process.stdout.write('-');
                }
                process.stdout.write('\n');
                updateProductInventory();// update the inventory of a product
                break;
            case '5':
                console.log('--------------------------------------');
                console.log('\t *** Good Bye ***');
                console.log('--------------------------------------');
                rl.close();
                break;
            default:
                console.log('Invalid option');
                main();
                break;
        }// end of switch statement
    });// end of rl.question function

}// end of main function

main();// start the main function
