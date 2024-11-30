const SmartContract = artifacts.require("SmartContract");

contract("SmartContract", accounts => {
    let smartContract;
    // Use different accounts for different roles
    const buyer = accounts[1];
    const seller = accounts[2];
    const courier = accounts[3];
    const orderAmount = web3.utils.toWei("0.001", "ether"); // Reduced to 0.001 ETH for testing

    beforeEach(async () => {
        smartContract = await SmartContract.new();
    });

    it("should execute the complete business process", async () => {
        const initialSellerBalance = await web3.eth.getBalance(seller);
        const initialCourierBalance = await web3.eth.getBalance(courier);

        await smartContract.createOrder(seller, courier, {
            from: buyer,
            value: orderAmount,
            gas: 300000  // Reduced gas limit
        });

        const order = await smartContract.orders(0);
        assert.equal(order.state.toString(), "0", "Initial state should be Ordered");
        
        await smartContract.confirmOrder(0, { from: seller, gas: 300000 });
        const confirmedOrder = await smartContract.orders(0);
        assert.equal(confirmedOrder.state.toString(), "1", "State should be Confirmed");

        await smartContract.shipOrder(0, { from: courier, gas: 300000 });
        const shippedOrder = await smartContract.orders(0);
        assert.equal(shippedOrder.state.toString(), "2", "State should be Shipped");

        await smartContract.confirmDelivery(0, { from: buyer, gas: 300000 });
        const deliveredOrder = await smartContract.orders(0);
        assert.equal(deliveredOrder.state.toString(), "3", "State should be Delivered");

        const finalSellerBalance = await web3.eth.getBalance(seller);
        const finalCourierBalance = await web3.eth.getBalance(courier);

        const sellerPayment = web3.utils.toBN(finalSellerBalance).sub(web3.utils.toBN(initialSellerBalance));
        const courierPayment = web3.utils.toBN(finalCourierBalance).sub(web3.utils.toBN(initialCourierBalance));
        
        // Simplified balance checks
        assert.isTrue(sellerPayment.gt(web3.utils.toBN(0)), "Seller should receive payment");
        assert.isTrue(courierPayment.gt(web3.utils.toBN(0)), "Courier should receive payment");
    });

    it("should fail when wrong party tries to confirm order", async () => {
        await smartContract.createOrder(seller, courier, {
            from: buyer,
            value: orderAmount,
            gas: 300000
        });

        try {
            await smartContract.confirmOrder(0, { from: buyer });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Only seller can confirm");
        }
    });

    it("should fail when trying to confirm delivery before shipping", async () => {
        await smartContract.createOrder(seller, courier, {
            from: buyer,
            value: orderAmount
        });

        try {
            await smartContract.confirmDelivery(0, { from: buyer });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Invalid state");
        }
    });

    it("should fail when trying to create order without payment", async () => {
        try {
            await smartContract.createOrder(seller, courier, {
                from: buyer,
                value: 0
            });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Payment required");
        }
    });
});