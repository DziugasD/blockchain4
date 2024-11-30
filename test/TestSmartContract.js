const SmartContract = artifacts.require("SmartContract");

contract("SmartContract", accounts => {
    let smartContract;
    const buyer = accounts[0];
    const seller = accounts[1];
    const courier = accounts[2];
    const orderAmount = web3.utils.toWei("1", "ether");

    beforeEach(async () => {
        smartContract = await SmartContract.new();
    });

    it("should execute the complete business process", async () => {
        // Step 1: Create order and deposit payment
        const initialSellerBalance = await web3.eth.getBalance(seller);
        const initialCourierBalance = await web3.eth.getBalance(courier);

        await smartContract.createOrder(seller, courier, {
            from: buyer,
            value: orderAmount
        });

        const order = await smartContract.orders(0);
        assert.equal(order.state.toString(), "0", "Initial state should be Ordered");
        
        // Step 2: Seller confirms order
        await smartContract.confirmOrder(0, { from: seller });
        const confirmedOrder = await smartContract.orders(0);
        assert.equal(confirmedOrder.state.toString(), "1", "State should be Confirmed");

        // Step 3: Courier ships the order
        await smartContract.shipOrder(0, { from: courier });
        const shippedOrder = await smartContract.orders(0);
        assert.equal(shippedOrder.state.toString(), "2", "State should be Shipped");

        // Step 4: Buyer confirms delivery, triggering payments
        await smartContract.confirmDelivery(0, { from: buyer });
        const deliveredOrder = await smartContract.orders(0);
        assert.equal(deliveredOrder.state.toString(), "3", "State should be Delivered");

        // Step 5: Verify payment distribution (90% to seller, 10% to courier)
        const finalSellerBalance = await web3.eth.getBalance(seller);
        const finalCourierBalance = await web3.eth.getBalance(courier);

        const sellerPayment = web3.utils.toBN(finalSellerBalance).sub(web3.utils.toBN(initialSellerBalance));
        const courierPayment = web3.utils.toBN(finalCourierBalance).sub(web3.utils.toBN(initialCourierBalance));
        
        const expectedSellerAmount = web3.utils.toBN(orderAmount).mul(web3.utils.toBN(90)).div(web3.utils.toBN(100));
        const expectedCourierAmount = web3.utils.toBN(orderAmount).sub(expectedSellerAmount);

        // Allow for a small difference due to gas costs
        const isSellerPaymentCorrect = Math.abs(sellerPayment.sub(expectedSellerAmount).toNumber()) < web3.utils.toWei('0.01', 'ether');
        const isCourierPaymentCorrect = Math.abs(courierPayment.sub(expectedCourierAmount).toNumber()) < web3.utils.toWei('0.01', 'ether');

        assert.isTrue(isSellerPaymentCorrect, "Seller should receive approximately 90%");
        assert.isTrue(isCourierPaymentCorrect, "Courier should receive approximately 10%");
    });

    it("should fail when wrong party tries to confirm order", async () => {
        await smartContract.createOrder(seller, courier, {
            from: buyer,
            value: orderAmount
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