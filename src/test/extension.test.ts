import * as assert from 'assert';

import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// TODO: add automated tests
	test('Sample', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
