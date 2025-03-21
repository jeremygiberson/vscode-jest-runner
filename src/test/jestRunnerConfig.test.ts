import * as vscode from 'vscode';
import { JestRunnerConfig } from '../jestRunnerConfig';
import { Uri, WorkspaceConfiguration, WorkspaceFolder } from './__mocks__/vscode';
import { isWindows } from '../util';

const describes = {
  windows: isWindows() ? describe : describe.skip,
  linux: ['linux', 'darwin'].includes(process.platform) ? describe : describe.skip,
};

const its = {
  windows: isWindows() ? it : it.skip,
  linux: ['linux', 'darwin'].includes(process.platform) ? it : it.skip,
};

describe('JestRunnerConfig', () => {
  describes.windows('Windows style paths', () => {
    let jestRunnerConfig: JestRunnerConfig;
    beforeEach(() => {
      jestRunnerConfig = new JestRunnerConfig();
      jest
        .spyOn(vscode.workspace, 'getWorkspaceFolder')
        .mockReturnValue(new WorkspaceFolder(new Uri('C:\\project') as any) as any);
    });

    it.each([
      ['absolute path (with \\)', 'C:\\project\\jestProject'],
      ['absolute path (with /)', 'C:/project/jestProject'],
      ['relative path', './jestProject'],
    ])('%s', (_testName, projectPath) => {
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
        new WorkspaceConfiguration({
          'jestrunner.projectPath': projectPath,
        }),
      );

      expect(jestRunnerConfig.cwd).toBe('C:\\project\\jestProject');
    });
  });

  describes.linux('Linux style paths', () => {
    let jestRunnerConfig: JestRunnerConfig;

    beforeEach(() => {
      jestRunnerConfig = new JestRunnerConfig();
      jest
        .spyOn(vscode.workspace, 'getWorkspaceFolder')
        .mockReturnValue(new WorkspaceFolder(new Uri('/home/user/project') as any) as any);
    });

    it.each([
      ['absolute path', '/home/user/project/jestProject'],
      ['relative path', './jestProject'],
    ])('%s', (_testName, projectPath) => {
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
        new WorkspaceConfiguration({
          'jestrunner.projectPath': projectPath,
        }),
      );

      expect(jestRunnerConfig.cwd).toBe('/home/user/project/jestProject');
    });
  });

  describe('getJestConfigPath', () => {
    describe('configPath is a string', () => {
      const scenarios: Array<
        [
          os: 'windows' | 'linux',
          name: string,
          workspacePath: string,
          projectPath: string | undefined,
          configPath: string,
          targetPath: string,
          expectedPath: string,
        ]
      > = [
        [
          'linux',
          'configPath is an absolute path',
          '/home/user/workspace',
          './jestProject',
          '/home/user/workspace/jestProject/jest.config.js',
          '/home/user/workspace/jestProject/src/index.test.js',
          '/home/user/workspace/jestProject/jest.config.js',
        ],
        [
          'linux',
          'configPath is a relative path',
          '/home/user/workspace',
          './jestProject',
          './jest.config.js',
          '/home/user/workspace/jestProject/src/index.test.js',
          '/home/user/workspace/jestProject/jest.config.js',
        ],
        [
          'linux',
          'configPath is a relative path, projectPath is not set',
          '/home/user/workspace',
          undefined,
          './jest.config.js',
          '/home/user/workspace/jestProject/src/index.test.js',
          '/home/user/workspace/jest.config.js',
        ],

        [
          'windows',
          'configPath is an absolute path (with \\)',
          'C:\\workspace',
          './jestProject',
          'C:\\workspace\\jestProject\\jest.config.js',
          'C:\\workspace\\jestProject\\src\\index.test.js',
          'C:\\workspace\\jestProject\\jest.config.js',
        ],
        [
          'windows',
          'configPath is an absolute path (with /)',
          'C:\\workspace',
          './jestProject',
          'C:/workspace/jestProject/jest.config.js',
          'C:\\workspace\\jestProject\\src\\index.test.js',
          'C:\\workspace\\jestProject\\jest.config.js',
        ],
        [
          'windows',
          'configPath is a relative path',
          'C:\\workspace',
          './jestProject',
          './jest.config.js',
          'C:\\workspace\\jestProject\\src\\index.test.js',
          'C:\\workspace\\jestProject\\jest.config.js',
        ],
        [
          'windows',
          'configPath is a relative path, projectPath is not set',
          'C:\\workspace',
          undefined,
          './jest.config.js',
          'C:\\workspace\\jestProject\\src\\index.test.js',
          'C:\\workspace\\jest.config.js',
        ],
      ];
      describe.each(scenarios.filter(([os]) => os === 'linux'))(
        '%s',
        (_os, _name, workspacePath, projectPath, configPath, targetPath, expectedPath) => {
          let jestRunnerConfig: JestRunnerConfig;

          beforeEach(() => {
            jestRunnerConfig = new JestRunnerConfig();
            jest
              .spyOn(vscode.workspace, 'getWorkspaceFolder')
              .mockReturnValue(new WorkspaceFolder(new Uri(workspacePath) as any) as any);
          });

          its[_os]('should return the expected config path', async () => {
            jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
              new WorkspaceConfiguration({
                'jestrunner.projectPath': projectPath,
                'jestrunner.configPath': configPath,
              }),
            );

            expect(jestRunnerConfig.getJestConfigPath(targetPath)).toBe(expectedPath);
          });
        },
      );
    });
    describe('configPath is a glob map', () => {
      const scenarios: Array<
        [
          os: 'windows' | 'linux',
          name: string,
          workspacePath: string,
          projectPath: string | undefined,
          configPath: Record<string, string>,
          targetPath: string,
          expectedPath: string,
        ]
      > = [
        [
          'linux',
          'matched glob specifies an absolute path',
          '/home/user/workspace',
          './jestProject',
          { '**/*.test.js': '/home/user/workspace/jestProject/jest.config.js' },
          '/home/user/workspace/jestProject/src/index.test.js',
          '/home/user/workspace/jestProject/jest.config.js',
        ],
        [
          'linux',
          'matched glob specifies a relative path',
          '/home/user/workspace',
          './jestProject',
          { '**/*.test.js': './jest.config.js' },
          '/home/user/workspace/jestProject/src/index.test.js',
          '/home/user/workspace/jestProject/jest.config.js',
        ],
        [
          'linux',
          'matched glob specifies a relative path, projectPath is not set',
          '/home/user/workspace',
          undefined,
          { '**/*.test.js': './jest.config.js' },
          '/home/user/workspace/jestProject/src/index.test.js',
          '/home/user/workspace/jest.config.js',
        ],
        [
          'linux',
          'first matched glob takes precedence',
          '/home/user/workspace',
          './jestProject',
          {
            '**/*.test.js': './jest.config.js',
            '**/*.spec.js': './jest.unit-config.js',
            '**/*.it.spec.js': './jest.it-config.js',
          },
          '/home/user/workspace/jestProject/src/index.it.spec.js',
          '/home/user/workspace/jestProject/jest.unit-config.js',
        ],
        // requires mocking fs.existsSync or jestRunnerConfig.findConfigPath
        // maybe break this into a separate test
        // [
        //   'linux',
        //   'returns projectPath if no matching glob (projectPath is relative)',
        //   '/home/user/workspace',
        //   './projectPath',
        //   {
        //     '**/*.test.js': './jest.config.js',
        //     '**/*.spec.js': './jest.unit-config.js',
        //     '**/*.it.spec.js': './jest.it-config.js',
        //   },
        //   '/home/user/workspace/jestProject/src/index.unit.spec.js',
        //   '/home/user/workspace/jestProject',
        // ],
      ];
      describe.each(scenarios.filter(([os]) => os === 'linux'))(
        '%s',
        (_os, _name, workspacePath, projectPath, configPath, targetPath, expectedPath) => {
          let jestRunnerConfig: JestRunnerConfig;

          beforeEach(() => {
            jestRunnerConfig = new JestRunnerConfig();
            jest
              .spyOn(vscode.workspace, 'getWorkspaceFolder')
              .mockReturnValue(new WorkspaceFolder(new Uri(workspacePath) as any) as any);
          });

          its[_os]('should return the expected config path', async () => {
            jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
              new WorkspaceConfiguration({
                'jestrunner.projectPath': projectPath,
                'jestrunner.configPath': configPath,
              }),
            );

            expect(jestRunnerConfig.getJestConfigPath(targetPath)).toBe(expectedPath);
          });
        },
      );
    });
  });
});
