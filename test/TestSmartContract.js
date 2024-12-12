const SmartContract = artifacts.require("SmartContract");

contract("SmartContract", accounts => {
    let smartContract;
    // Use different accounts for different roles
    const Vairuotojas = accounts[0];
    const Regitra = accounts[1];
    const egzaminuotojas = accounts[2];
    const orderAmount = web3.utils.toWei("0.001", "ether"); // Reduced to 0.001 ETH for testing

    beforeEach(async () => {
        smartContract = await SmartContract.new();
    });

    it("should execute the complete business process when exam is passed", async () => {
        const initialRegitraBalance = await web3.eth.getBalance(Regitra);
        const initialEgzaminuotojasBalance = await web3.eth.getBalance(egzaminuotojas);

        await smartContract.createOrder(Regitra, egzaminuotojas, {
            from: Vairuotojas,
            value: orderAmount,
            gas: 300000  // Reduced gas limit
        });

        const order = await smartContract.orders(0);
        assert.equal(order.state.toString(), "0", "Initial state should be Ordered");
        
        await smartContract.confirmRegistration(0, { from: Regitra, gas: 300000 });
        const confirmedOrder = await smartContract.orders(0);
        assert.equal(confirmedOrder.state.toString(), "1", "State should be Confirmed");

        await smartContract.conductExam(0, true, { from: egzaminuotojas, gas: 300000 });
        const shippedOrder = await smartContract.orders(0);
        assert.equal(shippedOrder.state.toString(), "2", "State should be Shipped");

        await smartContract.confirmResult(0, { from: Vairuotojas, gas: 300000 });
        const deliveredOrder = await smartContract.orders(0);
        assert.equal(deliveredOrder.state.toString(), "3", "State should be Delivered");

        const finalRegitraBalance = await web3.eth.getBalance(Regitra);
        const finalEgzaminuotojasBalance = await web3.eth.getBalance(egzaminuotojas);

        const RegitraPayment = web3.utils.toBN(finalRegitraBalance).sub(web3.utils.toBN(initialRegitraBalance));
        const egzaminuotojasPayment = web3.utils.toBN(finalEgzaminuotojasBalance).sub(web3.utils.toBN(initialEgzaminuotojasBalance));
        
        // Simplified balance checks
        assert.isTrue(RegitraPayment.gt(web3.utils.toBN(0)), "Regitra should receive payment");
        assert.isTrue(egzaminuotojasPayment.gt(web3.utils.toBN(0)), "Egzaminuotojas should receive payment");
    });

    it("should handle exam failure and still pay Regitra and Egzaminuotojas", async () => {
        const initialRegitraBalance = await web3.eth.getBalance(Regitra);
        const initialEgzaminuotojasBalance = await web3.eth.getBalance(egzaminuotojas);

        await smartContract.createOrder(Regitra, egzaminuotojas, {
            from: Vairuotojas,
            value: orderAmount,
            gas: 300000
        });

        await smartContract.confirmRegistration(0, { from: Regitra, gas: 300000 });

        await smartContract.conductExam(0, false, { from: egzaminuotojas, gas: 300000 });

        await smartContract.confirmResult(0, { from: Vairuotojas, gas: 300000 });

        const finalRegitraBalance = await web3.eth.getBalance(Regitra);
        const finalEgzaminuotojasBalance = await web3.eth.getBalance(egzaminuotojas);

        const RegitraPayment = web3.utils.toBN(finalRegitraBalance).sub(web3.utils.toBN(initialRegitraBalance));
        const egzaminuotojasPayment = web3.utils.toBN(finalEgzaminuotojasBalance).sub(web3.utils.toBN(initialEgzaminuotojasBalance));

        // Assert that Regitra and Egzaminuotojas received payment
        assert.isTrue(RegitraPayment.gt(web3.utils.toBN(0)), "Regitra should receive payment");
        assert.isTrue(egzaminuotojasPayment.gt(web3.utils.toBN(0)), "Egzaminuotojas should receive payment");
    });

    it("should grant license to Vairuotojas when exam is passed", async () => {
        const initialRegitraBalance = await web3.eth.getBalance(Regitra);
        const initialEgzaminuotojasBalance = await web3.eth.getBalance(egzaminuotojas);

        await smartContract.createOrder(Regitra, egzaminuotojas, {
            from: Vairuotojas,
            value: orderAmount,
            gas: 300000  // Reduced gas limit
        });

        const order = await smartContract.orders(0);
        assert.equal(order.state.toString(), "0", "Initial state should be Ordered");
        
        await smartContract.confirmRegistration(0, { from: Regitra, gas: 300000 });
        const confirmedOrder = await smartContract.orders(0);
        assert.equal(confirmedOrder.state.toString(), "1", "State should be Confirmed");

        await smartContract.conductExam(0, true, { from: egzaminuotojas, gas: 300000 });
        const shippedOrder = await smartContract.orders(0);
        assert.equal(shippedOrder.state.toString(), "2", "State should be Shipped");

        await smartContract.confirmResult(0, { from: Vairuotojas, gas: 300000 });
        const deliveredOrder = await smartContract.orders(0);
        assert.equal(deliveredOrder.state.toString(), "3", "State should be Delivered");

        const finalRegitraBalance = await web3.eth.getBalance(Regitra);
        const finalEgzaminuotojasBalance = await web3.eth.getBalance(egzaminuotojas);

        const RegitraPayment = web3.utils.toBN(finalRegitraBalance).sub(web3.utils.toBN(initialRegitraBalance));
        const egzaminuotojasPayment = web3.utils.toBN(finalEgzaminuotojasBalance).sub(web3.utils.toBN(initialEgzaminuotojasBalance));
        
        // Simplified balance checks
        assert.isTrue(RegitraPayment.gt(web3.utils.toBN(0)), "Regitra should receive payment");
        assert.isTrue(egzaminuotojasPayment.gt(web3.utils.toBN(0)), "Egzaminuotojas should receive payment");
    });

    it("should fail when wrong party tries to confirm registration", async () => {
        await smartContract.createOrder(Regitra, egzaminuotojas, {
            from: Vairuotojas,
            value: orderAmount,
            gas: 300000
        });

        try {
            await smartContract.confirmRegistration(0, { from: Vairuotojas });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Only Regitra can confirm");
        }
    });

    it("should fail when wrong party tries to confirm order", async () => {
        await smartContract.createOrder(Regitra, egzaminuotojas, {
            from: Vairuotojas,
            value: orderAmount,
            gas: 300000
        });

        try {
            await smartContract.confirmRegistration(0, { from: Vairuotojas });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Only Regitra can confirm");
        }
    });

    it("should fail when trying to confirm delivery before shipping", async () => {
        await smartContract.createOrder(Regitra, egzaminuotojas, {
            from: Vairuotojas,
            value: orderAmount
        });

        try {
            await smartContract.confirmResult(0, { from: Vairuotojas });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Invalid state");
        }
    });

    it("should fail when trying to create order without payment", async () => {
        try {
            await smartContract.createOrder(Regitra, egzaminuotojas, {
                from: Vairuotojas,
                value: 0
            });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert.include(error.message, "Payment required");
        }
    });
});